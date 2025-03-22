const convert = require('/convert-ascii-utf8.js');

// Enderecos das tags de entrada (vindas do CLP) a serem convertidas para utf-8
const inputTagAddresses = [
    this.config.TagName_M_9_36,
];

// Enderecos das tags de saida (enviadas para a IHM) a serem gravadas na tag local da IHM
const outputTagAddresses = [
    this.config.StrOutput,  
];

await convert.processMultipleInputs(inputTagAddresses, outputTagAddresses);
