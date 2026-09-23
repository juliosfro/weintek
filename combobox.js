var canvas = new Canvas();
var ma = new MouseArea();

this.widget.add(canvas);
this.widget.add(ma);

const { CODIGO_PRODUTO_PRODUZINDO, PRODUTO_DISPONIVEL } = this.config;

const items = [
    "COXA PIRULITO",
    "COXINHA DA ASA",
    "FILE DE COXA",
    "FILE DE PEITO",
    "MEIO DA ASA",
    "SASSAMI"
];

const baseLineHeight = 18;
const headerHeight = 55;
const fixedWidth = 300;

var isOpen = false;
var selectedIndex = 0;
var produtoDisponivelMask = 0;
var isConfirming = false;
var pendingIndex = -1;

function getItemBitNumber(itemText) {
    switch (itemText) {
        case "FILE DE COXA": return 1;
        case "FILE DE PEITO": return 2;
        case "MEIO DA ASA": return 3;
        case "SASSAMI": return 4;
        case "COXINHA DA ASA": return 5;
        case "COXA PIRULITO": return 6;
        default: return 0;
    }
}

function isItemEnabled(itemText) {
    var bitNum = getItemBitNumber(itemText);
    if (bitNum <= 0) return false;
    var bitMask = 1 << bitNum;
    var result = (produtoDisponivelMask & bitMask) !== 0;
    return result;
}

async function sendToPLC(arrayIndex, itemText) {
    try {
        var plcValue = getItemBitNumber(itemText);
        var targetAddress = CODIGO_PRODUTO_PRODUZINDO;
        
        if (targetAddress && typeof targetAddress === 'object' && targetAddress.address) {
            targetAddress = targetAddress.address;
        }

        await driver.promises.setData(targetAddress, plcValue);
    } catch (error) {
        console.error("[CLP] Erro ao comunicar com o CLP: " + error);
    }
}

function updateSelectedIndexFromValue(plcValue) {
    var productName = "";
    switch (plcValue) {
        case 1: productName = "FILE DE COXA"; break;
        case 2: productName = "FILE DE PEITO"; break;
        case 3: productName = "MEIO DA ASA"; break;
        case 4: productName = "SASSAMI"; break;
        case 5: productName = "COXINHA DA ASA"; break;
        case 6: productName = "COXA PIRULITO"; break;
    }

    if (productName !== "") {
        var foundIndex = items.indexOf(productName);
        if (foundIndex !== -1 && foundIndex !== selectedIndex) {
            selectedIndex = foundIndex;
            drawMenu();
        }
    }
}

async function initFromPLC() {
    try {
        var targetAddressProd = CODIGO_PRODUTO_PRODUZINDO;
        if (targetAddressProd && typeof targetAddressProd === 'object' && targetAddressProd.address) {
            targetAddressProd = targetAddressProd.address;
        }
        var dataProd = await driver.promises.getData(targetAddressProd, 1);
        if (dataProd && dataProd.values && dataProd.values.length > 0) {
            updateSelectedIndexFromValue(dataProd.values[0]);
        }

        var targetAddressDisp = PRODUTO_DISPONIVEL;
        if (targetAddressDisp && typeof targetAddressDisp === 'object' && targetAddressDisp.address) {
            targetAddressDisp = targetAddressDisp.address;
        }
        if (targetAddressDisp) {
            var dataDisp = await driver.promises.getData(targetAddressDisp, 1);
            if (dataDisp && dataDisp.values && dataDisp.values.length > 0) {
                produtoDisponivelMask = Number(dataDisp.values[0]);
            }
        }
    } catch (error) {
        console.error("[CLP] Erro ao ler valores iniciais do CLP: " + error);
    } finally {
        drawMenu();
    }
}

if (CODIGO_PRODUTO_PRODUZINDO && typeof CODIGO_PRODUTO_PRODUZINDO.onResponse === 'function') {
    CODIGO_PRODUTO_PRODUZINDO.onResponse((_err, data) => {
        if (data && data.values && data.values.length > 0) {
            updateSelectedIndexFromValue(data.values[0]);
        }
    });
}

if (PRODUTO_DISPONIVEL && typeof PRODUTO_DISPONIVEL.onResponse === 'function') {
    PRODUTO_DISPONIVEL.onResponse((_err, data) => {
        if (data && data.values && data.values.length > 0) {
            produtoDisponivelMask = Number(data.values[0]);
            drawMenu();
        }
    });
}

function getItemHeight(itemText) {
    return headerHeight;
}

function getTotalMenuHeight() {
    var totalHeight = headerHeight;
    if (isOpen) {
        items.forEach((item, index) => {
            if (index !== selectedIndex) {
                totalHeight += getItemHeight(item);
            }
        });
    }
    return totalHeight;
}

function calculateDynamicWidth() {
    return fixedWidth;
}

function drawMultiLineText(text, x, startY, totalHeight, isEnabled) {
    var lines = text.split("\n");
    var blockHeight = lines.length * baseLineHeight;
    var y = startY + ((totalHeight - blockHeight) / 2) + 12;

    canvas.fillStyle = isEnabled ? "#000000" : "#666666";
    canvas.font = "16px sans-serif";

    for (var i = 0; i < lines.length; i++) {
        canvas.fillText(lines[i], x, y + (i * baseLineHeight));
    }
}

function drawBox(x, y, w, h, fillColor, strokeColor) {
    canvas.fillStyle = fillColor;
    canvas.fillRect(x, y, w, h);
    canvas.strokeStyle = strokeColor || "#333333";
    canvas.beginPath();
    canvas.strokeRect(x, y, w - 1, h - 1);
}

function drawConfirmationDialog() {
    var dialogWidth = 280;
    var dialogHeight = 140;
    var dialogX = (canvas.width - dialogWidth) / 2;
    var dialogY = 80;

    canvas.fillStyle = "rgba(0, 0, 0, 0.4)";
    canvas.fillRect(0, 0, canvas.width, canvas.height);

    drawBox(dialogX, dialogY, dialogWidth, dialogHeight, "#FFFFFF", "#333333");

    canvas.fillStyle = "#000000";
    canvas.font = "bold 15px sans-serif";
    canvas.fillText("Confirmar seleção?", dialogX + 20, dialogY + 30);

    canvas.font = "14px sans-serif";
    canvas.fillStyle = "#333333";
    canvas.fillText('Deseja selecionar "' + items[pendingIndex] + '"?', dialogX + 20, dialogY + 60);

    drawBox(dialogX + 20, dialogY + 85, 110, 35, "#E0E0E0", "#999999");
    canvas.fillStyle = "#333333";
    canvas.font = "bold 13px sans-serif";
    canvas.fillText("Cancelar", dialogX + 45, dialogY + 108);

    drawBox(dialogX + 145, dialogY + 85, 110, 35, "#E0E0E0", "#999999");
    canvas.fillStyle = "#333333";
    canvas.fillText("Confirmar", dialogX + 168, dialogY + 108);
}

function drawMenu() {
    var dynamicWidth = calculateDynamicWidth();
    var totalHeight = getTotalMenuHeight();

    canvas.width = dynamicWidth;
    canvas.height = isConfirming ? Math.max(totalHeight + 2, 250) : totalHeight + 2;
    ma.width = canvas.width;
    ma.height = canvas.height;

    canvas.clearRect(0, 0, canvas.width, canvas.height);

    drawBox(0, 0, dynamicWidth, headerHeight, "#00FF00", "#008000");
    drawMultiLineText(items[selectedIndex], 15, 0, headerHeight, true);

    var arrowX = dynamicWidth - 25;
    var arrowY = headerHeight / 2;
    canvas.fillStyle = "#333333";
    canvas.beginPath();

    if (isOpen) {
        canvas.moveTo(arrowX - 6, arrowY + 4);
        canvas.lineTo(arrowX + 6, arrowY + 4);
        canvas.lineTo(arrowX, arrowY - 4);
    } else {
        canvas.moveTo(arrowX - 6, arrowY - 4);
        canvas.lineTo(arrowX + 6, arrowY - 4);
        canvas.lineTo(arrowX, arrowY + 4);
    }
    canvas.fill();

    if (isOpen) {
        var currentY = headerHeight;
        items.forEach((item, index) => {
            if (index === selectedIndex) return;

            var currentItemHeight = getItemHeight(item);
            var isEnabled = isItemEnabled(item);
            var fillColor = isEnabled ? "#FFFFFF" : "#E0E0E0";
            var strokeColor = "#333333";

            drawBox(0, currentY, dynamicWidth, currentItemHeight, fillColor, strokeColor);
            drawMultiLineText(item, 15, currentY, currentItemHeight, isEnabled);
            currentY += currentItemHeight;
        });
    }

    if (isConfirming) {
        drawConfirmationDialog();
    }
}

ma.on("mousedown", function(e) {
    var y = e.y;
    var x = e.x;
    var dynamicWidth = calculateDynamicWidth();
    var totalHeight = getTotalMenuHeight();

    if (isConfirming) {
        var dialogWidth = 280;
        var dialogHeight = 140;
        var dialogX = (canvas.width - dialogWidth) / 2;
        var dialogY = 80;

        if (x >= dialogX + 20 && x <= dialogX + 130 && y >= dialogY + 85 && y <= dialogY + 120) {
            isConfirming = false;
            pendingIndex = -1;
        } else if (x >= dialogX + 145 && x <= dialogX + 255 && y >= dialogY + 85 && y <= dialogY + 120) {
            selectedIndex = pendingIndex;
            isConfirming = false;
            var confirmedIndex = pendingIndex;
            pendingIndex = -1;
            sendToPLC(confirmedIndex, items[confirmedIndex]);
        }
        drawMenu();
        return;
    }

    if (x >= 0 && x <= dynamicWidth && y >= 0 && y <= totalHeight) {
        if (y <= headerHeight) {
            isOpen = !isOpen;
        } else if (isOpen && y > headerHeight) {
            var listY = y - headerHeight;
            var accumulatedHeight = 0;
            var clickedIndex = -1;

            for (var i = 0; i < items.length; i++) {
                if (i === selectedIndex) continue;
                var h = getItemHeight(items[i]);
                if (listY >= accumulatedHeight && listY < accumulatedHeight + h) {
                    clickedIndex = i;
                    break;
                }
                accumulatedHeight += h;
            }

            if (clickedIndex >= 0 && clickedIndex < items.length) {
                var isEnabled = isItemEnabled(items[clickedIndex]);
                if (isEnabled) {
                    pendingIndex = clickedIndex;
                    isOpen = false;
                    isConfirming = true;
                }
            }
        }
    } else {
        if (isOpen) isOpen = false;
    }

    drawMenu();
});

initFromPLC();