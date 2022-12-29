declare module 'ass-json' {
	interface Config {
		host: string
		port: number
		domain: string
		maxUploadSize: number
		isProxied: boolean
		useSsl: boolean
		resourceIdSize: number
		resourceIdType: string
		spaceReplace: string
		gfyIdSize: number
		mediaStrict: boolean
		viewDirect: boolean
		useIdInViewer: boolean
		idInViewerExtension: boolean
		dataEngine: string
		frontendName: string
		indexFile: string
		savePerDay: boolean
		allowRegistrations: boolean
		adminWebhookEnabled: boolean
		adminWebhookUrl: string
		adminWebhookUsername: string
		adminWebhookAvatar: string
		s3enabled: boolean
		s3endpoint: string
		s3bucket: string
		s3usePathStyle: boolean
		s3accessKey: string
		s3secretKey: string
		__WARNING__: string
		diskFilePath: string
		saveWithDate: boolean
		saveAsOriginal: boolean
	}

	interface MagicNumbers {
		HTTP: number
		HTTPS: number
		CODE_OK: number
		CODE_NO_CONTENT: number
		CODE_BAD_REQUEST: number
		CODE_UNAUTHORIZED: number
		CODE_NOT_FOUND: number
		CODE_CONFLICT: number
		CODE_PAYLOAD_TOO_LARGE: number
		CODE_UNSUPPORTED_MEDIA_TYPE: number
		CODE_INTERNAL_SERVER_ERROR: number
		KILOBYTES: number
	}

	interface Package {
		name: string
		version: string
		homepage: string
	}

	interface ServerSideEmbed {
		title: string
		description?: string
		author?: string
		authorUrl?: string
		provider?: string
		providerUrl?: string
		color?: string
	}
}
