export interface Metrics
{
    name: string;
    testMethods: number;
    snapshotTestMethods: number;
    assertions: number;
    snapshotAssertions: number;
    hasOnlyFileST: number;
    hasOnlyInlineST: number;
    hasBothST: number;
}

export interface Test 
{
    identifier: string;
    name: string;
    assertions: Assert[];
}

export interface Func
{
    identifier: string;
    assertions: Assert[];
}
  
export interface Assert 
{
    identifier: string;
    isFileSnapshot: boolean;
    isInlineSnapshot: boolean;
}