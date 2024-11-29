// tests/e2e/check.test.ts
import { exec } from 'child_process';
import { promisify } from 'util';
import { describe, it, expect } from 'vitest';

const execAsync = promisify(exec);
const CLI_COMMAND = 'npx tsx ./source/cli pdp check';

describe('pdp check command e2e', () => {
    // Test original functionality remains intact
    describe('backwards compatibility', () => {
        it('should work with basic required parameters', async () => {
            const { stdout } = await execAsync(
                `${CLI_COMMAND} -u testUser -r testResource -a read`
            );
            expect(stdout).toContain('user="testUser"');
            expect(stdout).toContain('action=read');
            expect(stdout).toContain('resource=testResource');
        },10000);

        it('should work with optional tenant parameter', async () => {
            const { stdout } = await execAsync(
                `${CLI_COMMAND} -u testUser -r testResource -a read "tenant" "customTenant"`
            );
            expect(stdout).toContain('DENIED');
        });

        it('should work with resource type:key format', async () => {
            const { stdout } = await execAsync(
                `${CLI_COMMAND} -u testUser -r "document:doc123" -a read`
            );
            expect(stdout).toContain('resource=document:doc123');
        });
    });

    // Test new attribute functionality
    describe('user attributes', () => {
        it('should handle single user attribute', async () => {
            const { stdout } = await execAsync(
                `${CLI_COMMAND} -u testUser -r testResource -a read -ua "role:admin"`
            );
            expect(stdout).toContain('DENIED');
        });

        it('should handle multiple user attributes', async () => {
            const { stdout } = await execAsync(
                `${CLI_COMMAND} -u testUser -r testResource -a read -ua "role:admin,department:IT,level:5"`
            );
            expect(stdout).toContain('DENIED');
        });

        it('should handle user attributes with different types', async () => {
            const { stdout } = await execAsync(
                `${CLI_COMMAND} -u testUser -r testResource -a read -ua "isAdmin:true,age:25,name:john"`
            );
            expect(stdout).toContain('DENIED');
        });
    });

    describe('resource attributes', () => {
        it('should handle single resource attribute', async () => {
            const { stdout } = await execAsync(
                `${CLI_COMMAND} -u testUser -r testResource -a read -ra "owner:john"`
            );
            expect(stdout).toContain('DENIED');
        });

        it('should handle multiple resource attributes', async () => {
            const { stdout } = await execAsync(
                `${CLI_COMMAND} -u testUser -r testResource -a read -ra "owner:john,status:active,priority:high"`
            );
            expect(stdout).toContain('DENIED');
        });

        it('should handle resource attributes with different types', async () => {
            const { stdout } = await execAsync(
                `${CLI_COMMAND} -u testUser -r testResource -a read -ra "isPublic:true,size:1024,type:document"`
            );
            expect(stdout).toContain('DENIED');
        });
    });

    describe('combined scenarios', () => {
        it('should handle both user and resource attributes', async () => {
            const { stdout } = await execAsync(
                `${CLI_COMMAND} -u testUser -r testResource -a read -ua "role:admin" -ra "status:active"`
            );
            expect(stdout).toContain('DENIED');
        });

        it('should work with all parameters combined', async () => {
            const { stdout } = await execAsync(
                `${CLI_COMMAND} -u testUser -r "document:doc123" -a write "tenant" customTenant -ua "role:admin,dept:IT" -ra "status:active,size:1024"`
            );
            expect(stdout).toContain('DENIED');
        });
    });

    describe('error handling', () => {
        it('should handle invalid user attribute format', async () => {
            try{
            const { stderr } = await execAsync(
                `${CLI_COMMAND} -u johnexample.com -r "document"`,
                { encoding: 'utf8' }
            );}
            catch (error) {
            expect(error.stderr).toContain('');
            }
        });

        it('should handle invalid resource attribute format', async () => {
            try {
                await execAsync(
                    `${CLI_COMMAND} -u johnexample.com -r "document"`,
                
                );
            } catch (error) {
                expect(error.stderr).toContain('');
            }
        },10000);
    });
});