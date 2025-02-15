import React from "react";
import {
    Text
 } from 'ink';

 type Props = {
    keyv?: string;
    local?: boolean;
    template?: string;
 }

 export default function ApplyComponent({
    keyv,
    local,
    template
 }:Props){
    return <>
    <Text>{keyv}</Text>
    </>
 }