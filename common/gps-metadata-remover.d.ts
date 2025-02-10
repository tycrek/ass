type ReadFunction = (size: number, offset: number) => Promise<Buffer>
type WriteFunction = (val: string, offset: number, enc: any) => Promise<void>
type Options = {
	skipXMPRemoval?: boolean
}

declare module '@xoi/gps-metadata-remover' {
	export async function removeLocation(path: string, read: ReadFunction, write: WriteFunction, options: Options = {}): Promise<boolean>
}
