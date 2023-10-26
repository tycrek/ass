import { EndpointRateLimitConfiguration } from 'ass';
import { NextFunction, Request, Response } from 'express';
import { rateLimit } from 'express-rate-limit';

/**
 * map that contains rate limiter middleware for each group
 */
const rateLimiterGroups = new Map<string, (req: Request, res: Response, next: NextFunction) => void>();

export const setRateLimiter = (group: string, config: EndpointRateLimitConfiguration | undefined): (req: Request, res: Response, next: NextFunction) => void => {
    if (config == null) { // config might be null if the user doesnt want a rate limit
        rateLimiterGroups.set(group, (req, res, next) => {
            next();
        });

        return rateLimiterGroups.get(group)!;
    } else {
        rateLimiterGroups.set(group, rateLimit({
            limit: config.requests,
            windowMs: config.duration * 1000,
            skipFailedRequests: true,
            legacyHeaders: false,
            standardHeaders: 'draft-7',
            keyGenerator: (req, res) => {
                return req.ip || 'disconnected';
            },
            handler: (req, res) => {
                res.status(429);
                res.contentType('json');
                res.send('{"success":false,"message":"Rate limit exceeded, try again later"}');
            }
        }));

        return rateLimiterGroups.get(group)!;
    }
}
/**
 * creates middleware for rate limiting
 */
export const rateLimiterMiddleware = (group: string, config: EndpointRateLimitConfiguration | undefined): (req: Request, res: Response, next: NextFunction) => void => {
    if (!rateLimiterGroups.has(group)) setRateLimiter(group, config);

    return (req, res, next) => {
        return rateLimiterGroups.get(group)!(req, res, next);
    };
};