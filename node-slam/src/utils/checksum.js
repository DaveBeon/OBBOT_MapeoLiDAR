function calculateXORChecksum(dataBuffer) {
  let checksum = 0;
  for (let i = 0; i < dataBuffer.length; i++) {
    checksum ^= dataBuffer[i];
  }
  return checksum;
}

module.exports = { calculateXORChecksum };
