// tests/utils/attributes.test.ts
import { parseAttributes } from '../../source/utils/attributes';
import { describe, it, expect } from 'vitest';

describe('parseAttributes', () => {
    it('should parse string attributes', () => {
        const result = parseAttributes('name:john,role:admin');
        expect(result).toEqual({
            name: 'john',
            role: 'admin'
        });
    });

    it('should parse number attributes', () => {
        const result = parseAttributes('age:25,score:98.5');
        expect(result).toEqual({
            age: 25,
            score: 98.5
        });
    });

    it('should parse boolean attributes', () => {
        const result = parseAttributes('active:true,verified:false');
        expect(result).toEqual({
            active: true,
            verified: false
        });
    });

    it('should handle mixed types', () => {
        const result = parseAttributes('name:john,age:30,active:true');
        expect(result).toEqual({
            name: 'john',
            age: 30,
            active: true
        });
    });

    it('should handle whitespace', () => {
        const result = parseAttributes(' name : john , age : 30 ');
        expect(result).toEqual({
            name: 'john',
            age: 30
        });
    });

    it('should return empty object for empty string', () => {
        const result = parseAttributes('');
        expect(result).toEqual({});
    });

    it('should return empty object for whitespace string', () => {
        const result = parseAttributes('   ');
        expect(result).toEqual({});
    });

    // Error cases
    it('should throw error for invalid format', () => {
        expect(() => parseAttributes('invalid')).toThrow('Invalid attribute format');
        expect(() => parseAttributes('key1:value1,invalid')).toThrow('Invalid attribute format');
    });

    it('should throw error for empty key', () => {
        expect(() => parseAttributes(':value')).toThrow('Attribute key cannot be empty');
        expect(() => parseAttributes('key1:value1,:value2')).toThrow('Attribute key cannot be empty');
    });

    it('should throw error for empty value', () => {
        expect(() => parseAttributes('key:')).toThrow('Value for key "key" cannot be empty');
        expect(() => parseAttributes('key1:value1,key2:')).toThrow('Value for key "key2" cannot be empty');
    });

    it('should handle special characters in values', () => {
        const result = parseAttributes('email:user@example.com,path:/home/user/doc');
        expect(result).toEqual({
            email: 'user@example.com',
            path: '/home/user/doc'
        });
    });

    it('should preserve case sensitivity in values', () => {
        const result = parseAttributes('name:John,role:Admin');
        expect(result).toEqual({
            name: 'John',
            role: 'Admin'
        });
    });
});