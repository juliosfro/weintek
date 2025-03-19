const encoding = require('/encoding.js');

let canvas = new Canvas();
let mouseArea = new MouseArea();

this.widget.add(canvas);
this.widget.add(mouseArea);

const maxLineBreakLength = 16;

const motorAtualClickIHMAdress = this.config.MotorAtualClickIHM;

// Quando o valor desse bit eh setado para 1 entao o popup eh mostrado
const showPopupIHMAddress = this.config.ShowPopupIHM;

// Tag 
const tagEquipamentoCLPAddress = this.config.TagEquipamentoCLP;
const tagEquipamentoIHMAddress = this.config.TagEquipamentoIHM;

// Velocidade do motor
const velocidadeAtualCLPAddress = this.config.VelocidadeAtualCLP;
const velocidadeAtualIHMAddress = this.config.VelocidadeAtualIHM;

// Corrente do motor
const correnteCLPAddress = this.config.CorrenteCLP;
const correnteIHMAddress = this.config.CorrenteIHM;

// Frequencia em Hz
const frequenciaCLPAdress = this.config.SetPointCLP;
const frequenciaIHMAddress = this.config.FrequenciaIHM;
const SetPointIHMAddress = this.config.SetPointIHM;
const changeFrequencySubscriptionIHMAddress = this.config.SetpointFrequenciaSubscriptionIHM;

async function updateFrequency() {
    const frequency = await driver.promises.getData(SetPointIHMAddress, 1);
    driver.setData(frequenciaCLPAdress, frequency.values);
}

let isOn = false;

async function getDataValuesFromCLP(tagAddress, tagLength) {
    const length = tagLength || 32;
    const data = await driver.promises.getData(tagAddress, tagLength);
    return data.values;
}

const dataValues = await getDataValuesFromCLP(tagEquipamentoCLPAddress, 32);

const tagEquipamentoRecebida = await convertToUtf8(dataValues);
const velocidadeDoMotorRecebida = await driver.promises.getData(velocidadeAtualCLPAddress, 1);
const frequenciaRecebida = await driver.promises.getData(frequenciaCLPAdress, 1);
const correnteDoMotorRecebida = await driver.promises.getData(correnteCLPAddress, 1);

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

function drawButton() {
  const buttonWidth = 100;
  const buttonHeight = 80;
  const x = 10;
  const y = 10;

  const grd = canvas.createLinearGradient(x, y, x + buttonWidth, y);
  grd.addColorStop(0, isOn ? "#4CAF50" : "#f44336");
  grd.addColorStop(1, isOn ? "#81C784" : "#FF6659");

  canvas.fillStyle = grd;
  canvas.fillRect(x, y, buttonWidth, buttonHeight);

  canvas.lineWidth = 4;
  canvas.strokeStyle = "#333";
  canvas.strokeRect(x, y, buttonWidth, buttonHeight);

  canvas.font = "20px Arial";
  canvas.fillStyle = "#fff";
  canvas.textAlign = "center";
  canvas.textBaseline = "middle";
  canvas.fillText(isOn ? "Ligado" : "Desligado", x + buttonWidth / 2, y + buttonHeight / 2);
}

let motorAtualClicado = "";
let permiteAlterarFrequencia = false;

async function param() {
    driver.setStringData(tagEquipamentoIHMAddress, 32, tagEquipamentoRecebida);
    driver.setData(SetPointIHMAddress, frequenciaRecebida.values);
    driver.setData(velocidadeAtualIHMAddress, velocidadeDoMotorRecebida.values);
    driver.setData(frequenciaIHMAddress, frequenciaRecebida.values);
    driver.setData(correnteIHMAddress, correnteDoMotorRecebida.values);
    driver.setData(showPopupIHMAddress, 1);
}

async function verificaCircuito() {
    var utf8decoder = new TextDecoder();

    const data = await driver.promises.getData(motorAtualClickIHMAdress, 32);

    var bufferAsUint8Array = new Uint8Array(data.buffer);
    motorAtualClicado = utf8decoder.decode(bufferAsUint8Array);

    const cleanString = (str) => str.replace(/\s+/g, '').replace(/\0/g, '').trim();

    const motorAtualClicadoCleanString = cleanString(motorAtualClicado);
    const tagEquipamentoRecebidaCleanString = cleanString(tagEquipamentoRecebida);

    permiteAlterarFrequencia = motorAtualClicadoCleanString === tagEquipamentoRecebidaCleanString; 

    return permiteAlterarFrequencia;
}

changeFrequencySubscriptionIHMAddress.onResponse((err, data) => {
    verificaCircuito().then(permiteAlterarFrequencia => {
        if (permiteAlterarFrequencia) {
            updateFrequency().then(() => {

                setTimeout(() => {
                    driver.getData(velocidadeAtualCLPAddress, 1, (error, data) => {
                        driver.setData(velocidadeAtualIHMAddress, data.values);
                    });

                    driver.getData(frequenciaCLPAdress, 1, (error, data) => {
                        driver.setData(frequenciaIHMAddress, data.values);
                    });

                    driver.getData(correnteCLPAddress, 1, (error, data) => {
                        driver.setData(correnteIHMAddress, data.values);
                    });
                }, 2000); // 2 segundos
            });
        }
    });
});

// Desenha o botao inicialmente
drawButton();

// Detecta o clique do mouse na area do botao
mouseArea.on('mousedown', (mouseEvent) => {
  const buttonWidth = 100;
  const buttonHeight = 80;
  const x = 10;
  const y = 10;
  
  if (mouseEvent.x >= x && mouseEvent.x <= x + buttonWidth && mouseEvent.y >= y && mouseEvent.y <= y + buttonHeight) {
    isOn = !isOn;
    driver.setStringData(motorAtualClickIHMAdress, 32, tagEquipamentoRecebida);
    param();
    drawButton(); // Redesenha o botao com o novo estado
  }
});
