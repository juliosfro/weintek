const encoding = require('/encoding.js');

// Componentes visuais
const canvas = new Canvas();
const mouseArea = new MouseArea();

this.widget.add(canvas);
this.widget.add(mouseArea);

// === CONFIGURAÇÕES ===
const {
    clp, ihm, mouseArea: mouseCfg, popUp
} = this.config;

const {
    MouseAreaWidth, MouseAreaHeight, MouseAreaStartX, MouseAreaStartY, DrawLineMouseArea
} = mouseCfg;

const {
    tagLength = 52,
    breakLength = 26
} = popUp || {};

const canvasSize = { width: 85, height: 81 };

// === VARIÁVEIS ===
let angle = 0;
let loadingSpinnerActive = false;
let loadingSpinnerTimeout = null;
let popupInterval = null;
let motorAtualClicado = "";
let canChange = false;

// === UTILS ===

function convertToValidBytes(data) {
    return data.map(v => (v < 0 ? v + 256 : v)).filter(v => v >= 0 && v <= 255);
}

function convertToUtf8(data) {
    const validBytes = convertToValidBytes(data);
    const isoString = encoding.codeToString(validBytes, 'ISO-8859-1');
    const utf8Array = new TextEncoder().encode(isoString);
    const utf8String = new TextDecoder("utf-8").decode(utf8Array);
    return formatTextWithLineBreaks(utf8String, breakLength);
}

function formatTextWithLineBreaks(text, maxLength) {
    return text.match(new RegExp(`.{1,${maxLength}}`, 'g')).join('\n').trimEnd();
}

function cleanString(str) {
    return str.replace(/\s+/g, '').replace(/\0/g, '').trim();
}

async function readAsciiFromCLPAddress(tagAddress) {
    const data = await driver.promises.getData(tagAddress, tagLength);
    return convertToUtf8(data.values);
}

function drawMouseArea() {
    canvas.fillStyle = "rgba(0, 0, 0, 0)";
    canvas.fillRect(MouseAreaStartX, MouseAreaStartY, MouseAreaWidth, MouseAreaHeight);

    if (DrawLineMouseArea) {
        canvas.lineWidth = 1;
        canvas.strokeStyle = "black";
        canvas.strokeRect(MouseAreaStartX, MouseAreaStartY, MouseAreaWidth, MouseAreaHeight);
    }
}

// === SPINNER ===

function drawLoadingSpinner() {
    if (!loadingSpinnerActive) return;

    canvas.clearRect(0, 0, canvasSize.width, canvasSize.height);
    canvas.strokeStyle = "#2ecc71";
    canvas.lineWidth = 6;
    canvas.lineCap = "round";
    canvas.setLineDash([4, 4]);

    const center = { x: canvasSize.width / 2, y: canvasSize.height / 2 };
    const radius = Math.min(canvasSize.width, canvasSize.height) / 2 - 10;

    canvas.beginPath();
    canvas.arc(center.x, center.y, radius, -Math.PI / 2, angle - Math.PI / 2, false);
    canvas.stroke();

    angle = (angle + 0.05) % (2 * Math.PI);
    loadingSpinnerTimeout = setTimeout(drawLoadingSpinner, 30);
}

function startLoadingSpinner() {
    loadingSpinnerActive = true;
    angle = 0;
    drawLoadingSpinner();
}

function stopLoadingSpinner() {
    loadingSpinnerActive = false;
    if (loadingSpinnerTimeout) clearTimeout(loadingSpinnerTimeout);
    canvas.clearRect(0, 0, canvasSize.width, canvasSize.height);
}

// === AÇÕES NO CLP ===

async function setOn() {
    driver.setData(clp.LigaCLP, 1);
}

async function setOff() {
    driver.setData(clp.DesligaCLP, 1);
}

async function resetFault() {
    driver.setData(clp.ResetaFalhaCLP, 1);
}

async function setManAuto(mode) {
    driver.setData(clp.ManualAutomaticoCLP, mode);
}

// Atualiza valor da frequência do setpoint
async function updateFrequency() {
    const { values } = await driver.promises.getData(ihm.SetPointIHM, 1);
    driver.setData(clp.FrequenciaCLP, values);
}

// === POPUP ===

async function updateInfoPopup() {
    const tagEquipamento = await readAsciiFromCLPAddress(clp.TagEquipamentoCLP);
    const nomeEquipamento = await readAsciiFromCLPAddress(clp.NomeEquipamentoCLP);

    const valores = await Promise.all([
        clp.VelocidadeRpmCLP, clp.FrequenciaCLP, clp.CorrenteCLP,
        clp.StatusLigadoCLP, clp.StatusFalhaCLP, clp.StatusManualAutomaticoCLP,
        clp.StatusIntertravamentoCLP, clp.StatusFalhaEmergCLP,
        clp.StatusFimDeCursoCLP, clp.StatusInStsCLP
    ].map(addr => driver.promises.getData(addr, 1)));

    const [
        velocidadeRpm, frequencia, corrente, statusLigado, statusFalha, statusManAuto,
        statusInterTrav, statusFalhaEmerg, statusFimCurso, statusInversor
    ] = valores.map(d => d.values);

    // Setar todos os dados na IHM
    const writes = [
        [ihm.TagEquipamentoIHM, tagEquipamento],
        [ihm.NomeEquipamentoIHM, nomeEquipamento],
        [ihm.VelocidadeRpmIHM, velocidadeRpm],
        [ihm.FrequenciaIHM, frequencia],
        [ihm.CorrenteIHM, corrente],
        [ihm.StatusLigadoIHM, statusLigado],
        [ihm.StatusFalhaIHM, statusFalha],
        [ihm.StatusManualAutomaticoIHM, statusManAuto],
        [ihm.StatusIntertravamentoIHM, statusInterTrav],
        [ihm.StatusFalhaEmergIHM, statusFalhaEmerg],
        [ihm.StatusFimDeCursoIHM, statusFimCurso],
        [ihm.StatusInStsIHM, statusInversor]
    ];

    // Espera todos os dados serem escritos na IHM
    await Promise.all(writes.map(async ([addr, value]) => {
        if (typeof value === 'string') {
            await driver.promises.setStringData(addr, tagLength, value);
        } else {
            await driver.promises.setData(addr, value);
        }
    }));

    driver.getData(ihm.KeypadSetPointHabilitadoIHM, 1, (_err, data) => {
        if (data.values[0] === 0) {
            driver.setData(ihm.SetPointIHM, frequencia);
        }
    });
}

async function isPopupOpen() {
    const { values } = await driver.promises.getData(ihm.ShowPopupIHM, 1);
    return values[0] === 1;
}

async function checkCircuit() {
    const utf8decoder = new TextDecoder();
    const data = await driver.promises.getData(ihm.MotorAtualClickIHM, tagLength);
    motorAtualClicado = utf8decoder.decode(new Uint8Array(data.buffer));
    const currentTag = cleanString(motorAtualClicado);
    const fetchedTag = cleanString(await readAsciiFromCLPAddress(clp.TagEquipamentoCLP));
    canChange = currentTag === fetchedTag;
    return canChange;
}

// === EVENTOS ===

function createResponseHandler(callback) {
    return (_err, data) => {
        checkCircuit().then(valid => {
            if (valid && data?.values) callback();
        });
    };
}

ihm.LigarSubscriptionIHM.onResponse(createResponseHandler(setOn));
ihm.DesligarSubscriptionIHM.onResponse(createResponseHandler(setOff));
ihm.ResetFalhaSubscriptionIHM.onResponse(createResponseHandler(resetFault));

ihm.ManualSubscriptionIHM.onResponse(createResponseHandler(() => setManAuto(0)));
ihm.AutomaticoSubscriptionIHM.onResponse(createResponseHandler(() => setManAuto(1)));

ihm.SetpointFrequenciaSubscriptionIHM.onResponse(() => {
    checkCircuit().then(valid => {
        driver.getData(ihm.KeypadSetPointHabilitadoIHM, 1, (_e, data) => {
            if (valid && data.values[0] === 1) updateFrequency();
        });
    });
});

// === MOUSE ===

mouseArea.on('click', ({ x, y }) => {
    if (x >= MouseAreaStartX && x <= MouseAreaStartX + MouseAreaWidth &&
        y >= MouseAreaStartY && y <= MouseAreaStartY + MouseAreaHeight) {

        readAsciiFromCLPAddress(clp.TagEquipamentoCLP).then(tag => {
            driver.setStringData(ihm.MotorAtualClickIHM, tagLength, tag);
        });

        driver.getData(ihm.StartLoadingSpinnerIHM, 1, (_e, data) => {
            if (data.values[0] === 0) {
                isPopupOpen().then(open => {
                    if (!open) {
                        startLoadingSpinner();
                        driver.setData(ihm.StartLoadingSpinnerIHM, 1);
                        updateInfoPopup().then(() => {
                            driver.setData(ihm.ShowPopupIHM, 1);
                            drawMouseArea();
                            popupInterval = setInterval(updateInfoPopup, 1000);
                        });
                    }
                });
            }
        });
    }
});

// === LOOP ===

const setMotorState = (newState) => {
    this.state = newState;
};

async function checkStatusMotor() {
    const [ligado, falha] = await Promise.all([
        driver.promises.getData(clp.StatusLigadoCLP, 1),
        driver.promises.getData(clp.StatusFalhaCLP, 1)
    ]);

    if (ligado.values[0] === 1) return setMotorState(1);
    if (falha.values[0] === 1) return setMotorState(2);
    setMotorState(0);
}

function checkPopupStatus() {
    isPopupOpen().then(open => {
        if (!open && popupInterval) {
            clearInterval(popupInterval);
            popupInterval = null;
        }

        if (open) stopLoadingSpinner();
    });
}

drawMouseArea();

setInterval(checkPopupStatus, 1000);
setInterval(checkStatusMotor, 1000);