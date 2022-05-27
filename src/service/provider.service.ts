import {getRepository} from "typeorm";
import {Provider} from "../entity/Provider";

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

export const getProviderByMinerId = (minerId: string) => {
    return getRepository(Provider).createQueryBuilder('p')
        .andWhere('p.minerId = :minerId')
        .setParameter('minerId', minerId)
        .getOne();
}