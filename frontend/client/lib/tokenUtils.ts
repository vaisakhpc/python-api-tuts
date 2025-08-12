import CryptoJS from "crypto-js";

const SALT = import.meta.env.VITE_TOKEN_SALT;

export function encodeToken(token: string): string {
  return CryptoJS.AES.encrypt(token, SALT).toString();
}

export function decodeToken(encrypted: string): string {
  try {
    return CryptoJS.AES.decrypt(encrypted, SALT).toString(CryptoJS.enc.Utf8);
  } catch {
    return "";
  }
}

export function getJwtPayload(token: string): any {
  try {
    const payload = token.split(".")[1];
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}
