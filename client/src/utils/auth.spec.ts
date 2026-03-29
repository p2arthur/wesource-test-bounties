import { getAuthHeaders } from './auth'

describe('getAuthHeaders', () => {
  it('should return empty object when no wallet or address', async () => {
    const result = await getAuthHeaders(undefined, undefined)
    expect(result).toEqual({})
  })

  it('should return empty object for web3auth wallet type', async () => {
    const result = await getAuthHeaders('web3auth', 'test-address')
    expect(result).toEqual({})
  })

  it('should throw error for traditional wallet without signMessage function', async () => {
    await expect(getAuthHeaders('traditional', 'test-address')).rejects.toThrow('signMessage function is required for traditional wallet')
  })

  it('should return authorization header for traditional wallet with signMessage', async () => {
    const mockSignMessage = jest.fn().mockResolvedValue('test-signature')
    const result = await getAuthHeaders('traditional', 'test-address', mockSignMessage)
    
    expect(mockSignMessage).toHaveBeenCalledWith('test-address')
    expect(result).toEqual({
      'Authorization': 'Wallet test-address:test-signature:test-address'
    })
  })

  it('should handle signMessage returning different signature', async () => {
    const mockSignMessage = jest.fn().mockResolvedValue('different-signature')
    const result = await getAuthHeaders('traditional', 'test-address', mockSignMessage)
    
    expect(result).toEqual({
      'Authorization': 'Wallet test-address:different-signature:test-address'
    })
  })
})