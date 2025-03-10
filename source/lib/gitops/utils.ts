import { randomBytes } from 'micro-key-producer/utils.js';
import ssh from 'micro-key-producer/ssh.js';

export function generateSSHKey() {
	const seed = randomBytes(32);
	return ssh(seed, 'help@permit.io');
}
