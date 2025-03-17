const encoding = require('/encoding.js');

// Inicializa o contexto do canvas
const ctx = new Canvas();
this.widget.add(ctx);

// Configuracoes do componente
const nameAddress = this.config.nameAddress;
const tagLength = this.config.tagLength || 32;
const colorText = this.config.colorText || 'black';
const font = this.config.font || '16px Calibri';
const rectangleColor = this.config.rectangleColor || '#c2f3fc';
const rectangleWidth = this.config.rectangleWidth || 200;
const rectangleHeight = this.config.rectangleHeight || 50;
const rectangleStartX = this.config.rectangleStartX || 5;
const rectangleStartY = this.config.rectangleStartY || 5;
const textHeight = this.config.textHeight || 16;
const maxLineBreakLength = this.config.maxLineBreakLength || 16;
const enableDrawRectangle = this.config.enableDrawRectangle;
const DEFAULT_TEXT = 'Endereço da tag não informado.';

if (!nameAddress) {
    if (enableDrawRectangle) {
        drawRectangle(rectangleStartX, rectangleStartY, rectangleWidth, rectangleHeight, rectangleColor);
    }
    drawText(formatTextWithLineBreaks(DEFAULT_TEXT, maxLineBreakLength), textHeight, rectangleStartX, rectangleStartY, rectangleWidth, rectangleHeight);
    return;
}

async function getDataValuesFromCLP(tagAddress, tagLength) {
    const length = tagLength || 32;
    const data = await driver.promises.getData(tagAddress, length);
    return data.values;
}

const dataValues = await getDataValuesFromCLP(nameAddress, tagLength);

// Converte a lista de valores ASCII em texto formatado
convertToUtf8(dataValues).then(text => {
    if (enableDrawRectangle) {
        drawRectangle(rectangleStartX, rectangleStartY, rectangleWidth, rectangleHeight, rectangleColor);
    }
    drawText(text, textHeight, rectangleStartX, rectangleStartY, rectangleWidth, rectangleHeight);
});

function convertToValidBytes(data) {
    return data.map(value => (value < 0 ? value + 256 : value))
        .filter(value => value >= 0 && value <= 255);
}

function convertToISO88591String(byteArray) {
    return encoding.codeToString(byteArray, 'ISO-8859-1');
}

async function convertToUtf8(data) {
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

function drawRectangle(x, y, width, height, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, width, height);
}

function drawText(text, textHeight, rectX, rectY, rectWidth, rectHeight) {
    ctx.font = font;
    ctx.fillStyle = colorText;

    const lines = text.split('\n');
    let textY = rectY + (rectHeight - (lines.length * textHeight)) / 2 + 10;

    for (let line of lines) {
        const textWidth = ctx.measureText(line).width;
        const textX = rectX + (rectWidth - textWidth) / 2;
        ctx.fillText(line, textX, textY);
        textY += textHeight;
    }
}