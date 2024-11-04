import ssh from 'micro-key-producer/ssh.js';
import { randomBytes } from 'micro-key-producer/utils.js';

export default function GenerateKeyGen() {
	const seed = randomBytes(32);
	const key = ssh(seed, 'help@permit.io');
	return key;
}
