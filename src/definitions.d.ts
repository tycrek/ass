import { Request, Response } from "express";

export interface FileData {
	// Data from Multer file object
	path: string
	size: number
	mimetype: string
	ext: string
	originalname: string

	// Data from ass
	randomId: string
	deleteId: string
	is: IsPossible,
	thumbnail: string
	vibrant: string
	sha1: string
	domain: string
	timestamp: number
	token: string
	opengraph: OpenGraphData
}

export interface IsPossible {
	image: boolean
	video: boolean
	audio: boolean
	other: boolean
}

export interface OpenGraphData {
	title?: string
	description?: string
	author?: string
	authorUrl?: string
	provider?: string
	providerUrl?: string
	color?: string
}

export interface AssRequest extends Request {
	resourceId?: string
	ass?: { resourceId: string }

}

export interface AssResponse extends Response {

}