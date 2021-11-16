export const addTextToNonce = (nonce, walletAddress) => {
    const customMessage = `Welcome to BitScreen!
    
    Your authentication status will be reset after 1 week.
    
    Wallet address:
    ${walletAddress}
    
    Nonce:
    ${nonce}
    `;
    
    return customMessage;
}