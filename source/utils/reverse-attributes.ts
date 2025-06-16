import { ConditionRef } from '../components/test/hooks/usePolicyABACSnapshot.js';
import { v4 as uuidv4 } from 'uuid';

export function attributeBuilder({
	value,
	condition,
}: {
	value: string | number | object;
	condition: string;
}) {
	if (
		[
			'equals',
			'contains',
			'greater-than-equals',
			'less-than-equals',
			'matches',
			'object-match',
			'is-subset-of',
			'is-superset-of',
			'intersect-with',
		].includes(condition)
	) {
		return value;
	} else if (['not-equals'].includes(condition)) {
		return `not-equals-${value}`;
	} else if (['greater-than'].includes(condition)) {
		return parseInt(value as string) + 1;
	} else if (['less-than'].includes(condition)) {
		return parseInt(value as string) - 1;
	} // more to come array<object>
	return value;
}

export function getRefValue({
	attributes,
	conditionMap,
	ref,
}: {
	attributes: Record<string, string | number | object>;
	conditionMap: Record<string, ConditionRef>;
	ref: string;
}): string | number | object {
	if (attributes[ref] !== undefined) {
		return attributes[ref];
	} else if (conditionMap[ref] !== undefined) {
		const attr = ref.split('.')[1] ?? '';
		const value = getRefValue({ attributes, conditionMap, ref: attr });
		attributes[ref] = attributeBuilder({
			value,
			condition: conditionMap[ref].condition,
		});
		return attributes[ref];
	}
	attributes[ref] = uuidv4();
	return attributes[ref];
}
