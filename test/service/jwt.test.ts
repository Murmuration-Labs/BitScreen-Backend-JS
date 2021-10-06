import {getMockReq, getMockRes} from "@jest-mock/express";
import * as jwt from 'jsonwebtoken';
import {getWalletAddressHashed, verifyAccessToken} from "../../src/service/jwt";
import * as config from "../../src/config";
import {JWT_SECRET} from "../../src/config";

const {res, next, mockClear} = getMockRes<any>({
    status: jest.fn(),
    send: jest.fn()
})

jest.mock("../../src/config", () => ({
    JWT_SECRET: "some_secret"
}))

describe("Verify access token", () => {
    beforeEach(() => {
        mockClear()
        jest.clearAllMocks()
    })

    it("Should throw error for missing Authorization header", async () => {
        const req = getMockReq()
        verifyAccessToken(req, res, next)

        expect(res.status).toHaveBeenCalledTimes(1)
        expect(res.status).toHaveBeenCalledWith(401)
        expect(res.end).toHaveBeenCalledTimes(1)
    })

    it("Should throw error for invalid JWT", async () => {
        const req = getMockReq({
            headers: {
                authorization: "Bearer invalidToken"
            }
        })

        verifyAccessToken(req, res, next)

        expect(res.status).toHaveBeenCalledTimes(1)
        expect(res.status).toHaveBeenCalledWith(401)
        expect(res.end).toHaveBeenCalledTimes(1)
    })

    it("Should go further with valid token", async () => {
        const token = jwt.sign(
            "someHashOfAWallet",
            "some_secret"
        )

        const req = getMockReq({
            headers: {
                authorization: "Bearer " + token
            }
        })

        verifyAccessToken(req, res, next)

        expect(next).toHaveBeenCalledTimes(1)
    })
})

describe("Get wallet address", () => {
    beforeEach(() => {
        mockClear()
        jest.clearAllMocks()
    })

    it("Should go further with valid token", async () => {
        const token = jwt.sign(
            "someHashOfAWallet",
            "some_secret"
        )

        const req = getMockReq({
            headers: {
                authorization: "Bearer " + token
            }
        })

        getWalletAddressHashed(req, res, next)

        expect(next).toHaveBeenCalledTimes(1)
        expect(req.body).toStrictEqual({walletAddressHashed: 'someHashOfAWallet'})
    })
})
