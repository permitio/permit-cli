// tests/e2e/check.test.ts
import { exec } from 'child_process';
import { promisify } from 'util';

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
        });

        it('should work with optional tenant parameter', async () => {
            const { stdout } = await execAsync(
                `${CLI_COMMAND} -u testUser -r testResource -a read -t customTenant`
            );
            expect(stdout).toContain('tenant=customTenant');
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
            expect(stdout).toContain('with attributes=role:admin');
        });

        it('should handle multiple user attributes', async () => {
            const { stdout } = await execAsync(
                `${CLI_COMMAND} -u testUser -r testResource -a read -ua "role:admin,department:IT,level:5"`
            );
            expect(stdout).toContain('with attributes=role:admin,department:IT,level:5');
        });

        it('should handle user attributes with different types', async () => {
            const { stdout } = await execAsync(
                `${CLI_COMMAND} -u testUser -r testResource -a read -ua "isAdmin:true,age:25,name:john"`
            );
            expect(stdout).toContain('with attributes=isAdmin:true,age:25,name:john');
        });
    });

    describe('resource attributes', () => {
        it('should handle single resource attribute', async () => {
            const { stdout } = await execAsync(
                `${CLI_COMMAND} -u testUser -r testResource -a read -ra "owner:john"`
            );
            expect(stdout).toContain('with attributes=owner:john');
        });

        it('should handle multiple resource attributes', async () => {
            const { stdout } = await execAsync(
                `${CLI_COMMAND} -u testUser -r testResource -a read -ra "owner:john,status:active,priority:high"`
            );
            expect(stdout).toContain('with attributes=owner:john,status:active,priority:high');
        });

        it('should handle resource attributes with different types', async () => {
            const { stdout } = await execAsync(
                `${CLI_COMMAND} -u testUser -r testResource -a read -ra "isPublic:true,size:1024,type:document"`
            );
            expect(stdout).toContain('with attributes=isPublic:true,size:1024,type:document');
        });
    });

    describe('combined scenarios', () => {
        it('should handle both user and resource attributes', async () => {
            const { stdout } = await execAsync(
                `${CLI_COMMAND} -u testUser -r testResource -a read -ua "role:admin" -ra "status:active"`
            );
            expect(stdout).toContain('with attributes=role:admin');
            expect(stdout).toContain('with attributes=status:active');
        });

        it('should work with all parameters combined', async () => {
            const { stdout } = await execAsync(
                `${CLI_COMMAND} -u testUser -r "document:doc123" -a write -t customTenant -ua "role:admin,dept:IT" -ra "status:active,size:1024"`
            );
            expect(stdout).toContain('user="testUser"');
            expect(stdout).toContain('with attributes=role:admin,dept:IT');
            expect(stdout).toContain('resource=document:doc123');
            expect(stdout).toContain('with attributes=status:active,size:1024');
            expect(stdout).toContain('tenant=customTenant');
            expect(stdout).toContain('action=write');
        });
    });

    describe('error handling', () => {
        it('should handle invalid user attribute format', async () => {
            const { stderr } = await execAsync(
                `${CLI_COMMAND} -u testUser -r testResource -a read -ua "invalid-format"`,
                { encoding: 'utf8' }
            );
            expect(stderr).toContain('Invalid attribute format');
        });

        it('should handle invalid resource attribute format', async () => {
            try {
                await execAsync(
                    `${CLI_COMMAND} -u testUser -r testResource -a read -ra "key="`,
                    { encoding: 'utf8' }
                );
            } catch (error) {
                expect(error.stderr).toContain('Invalid attribute format');
            }
            try {
                await execAsync(
                    `${CLI_COMMAND} -u testUser -r testResource`,
                    { encoding: 'utf8' }
                );
            } catch (error) {
                expect(error.stderr).toContain('Required at "action"');
            }
        });
    });
});