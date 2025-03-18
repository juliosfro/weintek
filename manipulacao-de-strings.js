const textDecoder = new TextDecoder();

const circuitoAddress = this.config.circuitAddress;
const circuitoData = await driver.promises.getData(circuitoAddress, 32);
const uint8ArrayBuffer = new Uint8Array(circuitoData.buffer);
const circuitoUtf8String = textDecoder.decode(uint8ArrayBuffer);

// Remove whitespace and newline characters using regex
const cleanedCircuitoString = circuitoUtf8String.replace(/\s+/g, '').replace(/\n/g, '');

console.log("Circuit: " + cleanedCircuitoString);
