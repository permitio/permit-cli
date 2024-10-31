import ssh from 'micro-key-producer/ssh.js';
import { randomBytes } from 'micro-key-producer/utils.js';

export default function GenerateKeyGen(email: string) {
	const seed = randomBytes(32);
	const key = ssh(seed, email);
	return key;
}
