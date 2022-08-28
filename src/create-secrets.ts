import { RepoProfile, SecretPair } from "./types";
import sodium from 'tweetsodium'

//https://docs.github.com/en/rest/actions/secrets#create-or-update-a-repository-secret
function encryptSecret(key: string, plainText: string) {
    // Convert the message and key to Uint8Array's (Buffer implements that interface)
    const messageBytes = Buffer.from(plainText);
    const keyBytes = Buffer.from(key, 'base64');

    // Encrypt using LibSodium.
    const encryptedBytes = sodium.seal(messageBytes, keyBytes);

    // Base64 the encrypted secret
    return Buffer.from(encryptedBytes).toString('base64');
}


export default function createSecrets(context:any, repoProfile: RepoProfile, publicKey: any, secretPairs: Array<SecretPair>) {
    for (const secretPair of secretPairs) {
        const SECRET_NAME = secretPair.secretName;
        const SECRET_PLAIN_TEXT = secretPair.secretPlainText;

        const encryptedSecret = encryptSecret(publicKey['key'], SECRET_PLAIN_TEXT);
        console.log(encryptedSecret);

        context.octokit.rest.actions.createOrUpdateRepoSecret({
            ...repoProfile,
            secret_name: SECRET_NAME,
            encrypted_value: encryptedSecret,
            key_id: publicKey['key_id']
        }).catch((err: any) => {
            console.log('Create secret failed! err is:' + err);
        })


    }
}


