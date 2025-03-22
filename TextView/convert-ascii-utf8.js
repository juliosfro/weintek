const encoding = require('/encoding.js');

// Função para converter valores negativos para o intervalo 0-255
function convertToValidBytes(data) {
    return data.map(value => (value < 0 ? value + 256 : value)).filter(value => value > 0 && value <= 255);
}

// Função para converter um array de bytes para uma string ISO-8859-1
function convertToISO88591String(byteArray) {
    return encoding.codeToString(byteArray, 'ISO-8859-1');
}

// Função para converter para UTF-8 e processar dados
async function convertAndSendUtf8(data, strOutput) {
    // Filtrar e converter os valores negativos para o intervalo 0-255
    const validBytes = convertToValidBytes(data.values);

    // Passo 1: Convertendo o array de bytes para uma string usando ISO-8859-1 (Latin-1)
    const isoString = convertToISO88591String(validBytes);

    // Passo 2: Agora, convertendo para UTF-8 com TextEncoder
    const utf8Array = new TextEncoder().encode(isoString);

    // Passo 3: Caso queira visualizar a string em UTF-8 (como texto)
    const utf8String = new TextDecoder("utf-8").decode(utf8Array);

    // Inserir quebra de linha a cada 22 caracteres
    let textoComQuebras = '';
    for (let i = 0; i < utf8String.length; i += 22) {
        textoComQuebras += utf8String.slice(i, i + 22) + '\n';
    }

    // Remover a última quebra de linha extra
    textoComQuebras = textoComQuebras.trimEnd();

    // Enviar para a saída
    await driver.promises.setStringData(strOutput, 32, textoComQuebras);
}

// Função para percorrer os arrays de entradas e saídas
async function processMultipleInputs(inputAddresses, outputAddresses) {
    try {
        for (let i = 0; i < inputAddresses.length; i++) {
            const inputAddr = inputAddresses[i];
            const outputAddr = outputAddresses[i];

            // Obter os dados para o inputAddr
            const inputData = await driver.promises.getData(inputAddr, 32);

            // Processar a conversão para UTF-8 e enviar para o outputAddr
            await convertAndSendUtf8(inputData, outputAddr);
        }
    } catch (err) {
        console.log('Error:', err.message);
    }
}

// Chamar a função para processar os múltiplos dados
exports.processMultipleInputs = processMultipleInputs;
