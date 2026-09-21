var canvas = new Canvas();
var ma = new MouseArea();

this.widget.add(canvas);
this.widget.add(ma);

// Mapeia as configurações do widget da Weintek
const { CODIGO_PRODUTO_PRODUZINDO } = this.config;

// Lista de itens ordenada em ordem alfabética
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

// Estados para a Caixa de Confirmação
var isConfirming = false;
var pendingIndex = -1;

// Função dedicada para enviar o comando/valor utilizando promises
async function sendToPLC(arrayIndex, itemText) {
    try {
        var plcValue = 0;

        // Mapeamento exato solicitado para a variável DINT CODIGO_PRODUTO_PRODUZINDO
        switch (itemText) {
            case "FILE DE COXA":
                plcValue = 1;
                break;
            case "FILE DE PEITO":
                plcValue = 2;
                break;
            case "MEIO DA ASA":
                plcValue = 3;
                break;
            case "SASSAMI":
                plcValue = 4;
                break;
            case "COXINHA DA ASA":
                plcValue = 5;
                break;
            case "COXA PIRULITO":
                plcValue = 6;
                break;
            default:
                plcValue = 0;
                break;
        }
        
        // Garante que o endereço passado para el driver seja válido (extraindo a referência correta da subscription)
        var targetAddress = CODIGO_PRODUTO_PRODUZINDO;
        if (targetAddress && typeof targetAddress === 'object' && targetAddress.address) {
            targetAddress = targetAddress.address;
        }

        // Envio assíncrono padrão do EasyBuilder Pro via driver.promises
        await driver.promises.setData(targetAddress, plcValue);
        
        console.log("[CLP] Valor enviado com sucesso via Promise: " + plcValue + " | Produto: " + itemText);
    } catch (error) {
        console.error("[CLP] Erro ao comunicar com o CLP via promises: " + error);
    }
}

// Função auxiliar para processar e atualizar o índice com base no valor numérico do CLP
function updateSelectedIndexFromValue(plcValue) {
    var productName = "";

    switch (plcValue) {
        case 1: productName = "FILE DE COXA"; break;
        case 2: productName = "FILE DE PEITO"; break;
        case 3: productName = "MEIO DA ASA"; break;
        case 4: productName = "SASSAMI"; break;
        case 5: productName = "COXINHA DA ASA"; break;
        case 6: productName = "COXA PIRULITO"; break;
        default: productName = ""; break;
    }

    if (productName !== "") {
        var foundIndex = items.indexOf(productName);
        if (foundIndex !== -1 && foundIndex !== selectedIndex) {
            selectedIndex = foundIndex;
            console.log("[CLP] Valor atualizado externamente! Novo índice: " + selectedIndex + " (" + productName + ")");
            drawMenu(); // Redesenha a tela automaticamente ao mudar
        }
    }
}

// Função para buscar o valor inicial no CLP ao carregar o widget
async function initFromPLC() {
    try {
        var targetAddress = CODIGO_PRODUTO_PRODUZINDO;
        if (targetAddress && typeof targetAddress === 'object' && targetAddress.address) {
            targetAddress = targetAddress.address;
        }

        var data = await driver.promises.getData(targetAddress, 1);
        if (data && data.values && data.values.length > 0) {
            updateSelectedIndexFromValue(data.values[0]);
        }
    } catch (error) {
        console.error("[CLP] Erro ao ler valor inicial do CLP: " + error);
    } finally {
        drawMenu();
    }
}

// Evento disparado automaticamente sempre que a subscription mudar externamente (CLP ou outra tela)
if (CODIGO_PRODUTO_PRODUZINDO && typeof CODIGO_PRODUTO_PRODUZINDO.onResponse === 'function') {
    CODIGO_PRODUTO_PRODUZINDO.onResponse((_err, data) => {
        if (data && data.values && data.values.length > 0) {
            updateSelectedIndexFromValue(data.values[0]);
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

    // Botão "Cancelar"
    drawBox(dialogX + 20, dialogY + 85, 110, 35, "#E0E0E0", "#999999");
    canvas.fillStyle = "#333333";
    canvas.font = "bold 13px sans-serif";
    canvas.fillText("Cancelar", dialogX + 45, dialogY + 108);

    // Botão "Confirmar"
    drawBox(dialogX + 145, dialogY + 85, 110, 35, "#E0E0E0", "#999999");
    canvas.fillStyle = "#333333";
    canvas.fillText("Confirmar", dialogX + 168, dialogY + 108);
}

function drawMenu() {
    var dynamicWidth = calculateDynamicWidth();
    var totalHeight = getTotalMenuHeight();

    canvas.width = dynamicWidth;
    canvas.height = isConfirming ? Math.max(totalHeight + 2, 250) : (totalHeight + 2);
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
            let isEnabled = true;

            var fillColor = isEnabled ? "#FFFFFF" : "#CCCCCC";
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
            console.log("Ação cancelada pelo usuário.");
        }
        else if (x >= dialogX + 145 && x <= dialogX + 255 && y >= dialogY + 85 && y <= dialogY + 120) {
            selectedIndex = pendingIndex;
            isConfirming = false;
            pendingIndex = -1;
            
            sendToPLC(selectedIndex, items[selectedIndex]);
        }
        
        drawMenu();
        return;
    }

    if (x >= 0 && x <= dynamicWidth && y >= 0 && y <= totalHeight) {
        if (y <= headerHeight) {
            isOpen = !isOpen;
        } 
        else if (isOpen && y > headerHeight) {
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
                let isEnabled = true;

                if (!isEnabled) {
                    console.log("Ação bloqueada: O item " + items[clickedIndex] + " está desabilitado!");
                } else {
                    pendingIndex = clickedIndex;
                    isOpen = false;
                    isConfirming = true;
                }
            }
        }
    } else {
        if (isOpen) {
            isOpen = false;
        }
    }
    
    drawMenu();
});

// Inicializa lendo do CLP na primeira carga
initFromPLC();