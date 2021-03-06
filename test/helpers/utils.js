module.exports = {
  expectThrow: async promise => {
    try {
      await promise
    } catch (error) {
      const invalidJump = error.message.search('invalid JUMP') >= 0
      const invalidOpcode = error.message.search('invalid opcode') >= 0
      const outOfGas = error.message.search('out of gas') >= 0
      assert(invalidJump || invalidOpcode || outOfGas, "Expected throw, got '" + error + "' instead")
      return
    }
    assert.fail('Expected throw not received')
  },
  assertRevert: async promise => {
    try {
        await promise
    } catch (error) {
        assert.isAbove(error.message.search('revert'), -1, 'Error containing "revert" must be returned');
        return
    }
    assert.fail('Expected throw not received')
  }
}

