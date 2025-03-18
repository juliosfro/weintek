// Criar variavel local HMI do tipo LW 32-bit float 
// Adicionar display numerico apontando para a variavel local criada
// Em Format colocar type Default
// left of decimal 2 e right of decimal 1, scaling method: None, Limits: Direct

const temperatureAddress = this.config.temperatureAddress;
const temperatureValue = 36.8;

driver.setData(temperatureAddress, temperatureValue);

// Quando for dados do tipo Number Integer, Float ou Double usar 1 como lenght
const temperatureData = await driver.promises.getData(temperatureAddress, 1);
console.log("Dado obtido " + temperatureData.values);