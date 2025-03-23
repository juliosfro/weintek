const encoding = require('/encoding.js');

const canvas = new Canvas();
const mouseArea = new MouseArea();

this.widget.add(canvas);
this.widget.add(mouseArea);

const tagWordLength = 32;
const maxLineBreakLength = 16;

// Configuracoes da area de click do mouse sob o componente
const mouseAreaWidth = this.config.mouseArea.MouseAreaWidth;
const mouseAreaHeight = this.config.mouseArea.MouseAreaHeight;
const mouseAreaStartX = this.config.mouseArea.MouseAreaStartX;
const mouseAreaStartY = this.config.mouseArea.MouseAreaStartY;
const drawLineMouseArea = this.config.mouseArea.DrawLineMouseArea;

const motorAtualClickIHMAdress = this.config.ihm.MotorAtualClickIHM;

// Quando o valor desse bit eh setado para 1 entao o popup eh mostrado
const showPopupIHMAddress = this.config.ihm.ShowPopupIHM;

// Status de ligado
const statusLigadoCLPAddress = this.config.clp.StatusLigadoCLP;
const statusLigadoIHMAddress = this.config.ihm.StatusLigadoIHM;

// Tag 
const tagEquipamentoCLPAddress = this.config.clp.TagEquipamentoCLP;
const tagEquipamentoIHMAddress = this.config.ihm.TagEquipamentoIHM;

// Nome
const nomeEquipamentoCLPAddress = this.config.clp.NomeEquipamentoCLP;
const nomeEquipamentoIHMAddress = this.config.ihm.NomeEquipamentoIHM;

// Velocidade do motor
const velocidadeAtualCLPAddress = this.config.clp.VelocidadeAtualCLP;
const velocidadeAtualIHMAddress = this.config.ihm.VelocidadeAtualIHM;

// Corrente do motor
const correnteCLPAddress = this.config.clp.CorrenteCLP;
const correnteIHMAddress = this.config.ihm.CorrenteIHM;

// Frequencia em Hz
const frequenciaCLPAdress = this.config.clp.SetPointCLP;
const setPointIHMAddress = this.config.ihm.SetPointIHM;
const frequenciaIHMAddress = this.config.ihm.FrequenciaIHM;
const notificaAlteracaoSPIHMAddress = this.config.ihm.NotificaAlteracaoSPIHM;
const changeFrequencySubscriptionIHMAddress = this.config.ihm.SetpointFrequenciaSubscriptionIHM;

// Busca no CLP o nome da tag do equipamento
const dataValuesTagEquipamento = await readAsciiFromCLPAddress(tagEquipamentoCLPAddress, tagWordLength);
const tagEquipamentoRecebida = await convertToUtf8(dataValuesTagEquipamento);
driver.setStringData(tagEquipamentoIHMAddress, tagWordLength, tagEquipamentoRecebida);

// Busca no CLP o nome (descricao) do equipamento e seta na variavel local da IHM
const dataValuesNomeEquipamento = await readAsciiFromCLPAddress(nomeEquipamentoCLPAddress, tagWordLength);
const nomeEquipamentoRecebido = await convertToUtf8(dataValuesNomeEquipamento);
driver.setStringData(nomeEquipamentoIHMAddress, tagWordLength, nomeEquipamentoRecebido);

async function updateFrequency() {
    const frequency = await driver.promises.getData(setPointIHMAddress, 1);
    driver.setData(frequenciaCLPAdress, frequency.values);
}

async function readAsciiFromCLPAddress(tagAddress, tagLength) {
    const length = tagLength || tagWordLength;
    const data = await driver.promises.getData(tagAddress, length);
    return data.values;
}

function convertToValidBytes(data) {
    return data.map(value => (value < 0 ? value + 256 : value))
        .filter(value => value >= 0 && value <= 255);
}

function convertToISO88591String(byteArray) {
    return encoding.codeToString(byteArray, 'ISO-8859-1');
}

function convertToUtf8(data) {
    const validBytes = convertToValidBytes(data);
    const isoString = convertToISO88591String(validBytes);
    const utf8Array = new TextEncoder().encode(isoString);
    const utf8String = new TextDecoder("utf-8").decode(utf8Array);
    return formatTextWithLineBreaks(utf8String, maxLineBreakLength);
}

function formatTextWithLineBreaks(text, maxLength) {
    let formattedText = '';
    for (let i = 0; i < text.length; i += maxLength) {
        formattedText += text.slice(i, i + maxLength) + '\n';
    }
    return formattedText.trimEnd();
}

function drawMouseArea() {
    // Cor de fundo transparente
    canvas.fillStyle = "rgba(0, 0, 0, 0)";  // Fundo transparente
    canvas.fillRect(mouseAreaStartX, mouseAreaStartY, mouseAreaWidth, mouseAreaHeight);

    // Borda visivel
    if (drawLineMouseArea) {
        canvas.lineWidth = 1;
        canvas.strokeStyle = "black";
        canvas.strokeRect(mouseAreaStartX, mouseAreaStartY, mouseAreaWidth, mouseAreaHeight);
    }
}

let motorAtualClicado = "";
let canChangeFrequency = false;

// Busca as informacoes no CLP e atualiza no popup
async function updateInfoPopup() {
    const dataValuesTagEquipamento = await readAsciiFromCLPAddress(tagEquipamentoCLPAddress, tagWordLength);
    const tagEquipamentoRecebida = await convertToUtf8(dataValuesTagEquipamento);
    const dataValuesNomeEquipamento = await readAsciiFromCLPAddress(nomeEquipamentoCLPAddress, tagWordLength);
    const nomeEquipamentoRecebido = await convertToUtf8(dataValuesNomeEquipamento);
    const velocidadeDoMotorRecebida = await driver.promises.getData(velocidadeAtualCLPAddress, 1);
    const frequenciaRecebida = await driver.promises.getData(frequenciaCLPAdress, 1);
    const correnteDoMotorRecebida = await driver.promises.getData(correnteCLPAddress, 1);
    const statusLigadoRecebido = await driver.promises.getData(statusLigadoCLPAddress, 1);

    driver.setStringData(tagEquipamentoIHMAddress, tagWordLength, tagEquipamentoRecebida);
    driver.setStringData(nomeEquipamentoIHMAddress, tagWordLength, nomeEquipamentoRecebido);
    driver.setData(velocidadeAtualIHMAddress, velocidadeDoMotorRecebida.values);
    driver.setData(frequenciaIHMAddress, frequenciaRecebida.values);
    driver.setData(correnteIHMAddress, correnteDoMotorRecebida.values);
    driver.setData(statusLigadoIHMAddress, statusLigadoRecebido.values);

    driver.getData(notificaAlteracaoSPIHMAddress, 1, (error, data) => {
        // Se o valor do setpoint estiver sendo alterado entao nao deve ser atualizado com o valor do CLP
        if (data.values[0] === 0) {
            driver.setData(setPointIHMAddress, frequenciaRecebida.values);
        }
    });
}

// Verifica se o motor atual clicado corresponde a tag recebida
async function checkCircuit() {
    const utf8decoder = new TextDecoder();

    const data = await driver.promises.getData(motorAtualClickIHMAdress, tagWordLength);

    const bufferAsUint8Array = new Uint8Array(data.buffer);
    motorAtualClicado = utf8decoder.decode(bufferAsUint8Array);

    const cleanString = (str) => str.replace(/\s+/g, '').replace(/\0/g, '').trim();

    const motorAtualClicadoCleanString = cleanString(motorAtualClicado);
    const tagEquipamentoRecebidaCleanString = cleanString(tagEquipamentoRecebida);

    canChangeFrequency = motorAtualClicadoCleanString === tagEquipamentoRecebidaCleanString;

    return canChangeFrequency;
}

changeFrequencySubscriptionIHMAddress.onResponse((_err, _data) => {
    checkCircuit().then(canChangeFrequency => {
        driver.getData(notificaAlteracaoSPIHMAddress, 1, (_error, isNumpadSetPointEnabled) => {
            if (canChangeFrequency && isNumpadSetPointEnabled.values) {
                updateFrequency().then(() => {
                    // console.log("Frequencia alterada... 9.5 A");
                    // console.log("Notifica " + data.values);
                    setTimeout(() => {
                        driver.getData(velocidadeAtualCLPAddress, 1, (_error, motorRotationRpm) => {
                            driver.setData(velocidadeAtualIHMAddress, motorRotationRpm.values);
                        });

                        driver.getData(frequenciaCLPAdress, 1, (_error, frequency) => {
                            driver.setData(frequenciaIHMAddress, frequency.values);
                        });

                        driver.getData(correnteCLPAddress, 1, (_error, motorCurrentAmps) => {
                            driver.setData(correnteIHMAddress, motorCurrentAmps.values);
                        });
                    }, 2000); // 2 segundos
                });
            }
        });
    });
});

// Desenha a area de click do mouse
drawMouseArea();

// Variavel para armazenar o ID do intervalo
let popupInterval = null;

// Funcao para verificar se o popup esta aberto
async function isPopupOpen() {
    const { values: isOPen } = await driver.promises.getData(showPopupIHMAddress, 1);
    return isOPen;
}

// Detecta o clique do mouse na area do botao
mouseArea.on('click', (mouseEvent) => {
    const buttonWidth = mouseAreaWidth;
    const buttonHeight = mouseAreaHeight;
    const x = mouseAreaStartX;
    const y = mouseAreaStartY;

    if (mouseEvent.x >= x && mouseEvent.x <= x + buttonWidth && mouseEvent.y >= y && mouseEvent.y <= y + buttonHeight) {
        driver.setStringData(motorAtualClickIHMAdress, tagWordLength, tagEquipamentoRecebida);

        // Verifica o status atual do popup
        isPopupOpen().then((isOPen) => {

            // Funcao para alterar o status do motor (shape picture), ligado, desligado, em falha, etc.
            setMotorState(1);
            
            // Se o popup nao estiver aberto (assumindo que 0 significa fechado)
            if (isOPen[0] === 0) {
                updateInfoPopup().then(() => {
                    // Abre o popup
                    driver.setData(showPopupIHMAddress, 1);
                    // Redesenha a area de click do mouse
                    drawMouseArea();

                    // Inicia o intervalo para atualizar as informacoes a cada 1 segundo
                    popupInterval = setInterval(() => {
                        updateInfoPopup().then(() => {
                            // console.log("Atualizando informacoes do popup...");
                        });
                    }, 1000);  // Atualiza a cada 1 segundo
                });
            }
        });
    }
});

// Verifica o fechamento do popup e limpa o intervalo
async function checkPopupStatus() {
    isPopupOpen().then((isOPen) => {
        if (isOPen[0] === 0 && popupInterval !== null) {
            // Limpa o intervalo quando o popup for fechado
            clearInterval(popupInterval);
            // Reseta a variavel do intervalo 
            popupInterval = null;
        }
    });
}

const setMotorState = (newState) => {
    this.state = newState;
};

// Checa periodicamente se o popup esta fechado
setInterval(checkPopupStatus, 1000);
