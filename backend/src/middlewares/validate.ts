import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationChain } from 'express-validator';
import { respond } from '../utils/respond';

/**
 * Run a chain of express-validator rules, then return 400 if any fail.
 * Usage: router.post('/route', validate([body('x').notEmpty()]), handler)
 */
export function validate(chains: ValidationChain[]) {
  return async function (req: Request, res: Response, next: NextFunction): Promise<void> {
    // Run all chains in parallel
    await Promise.all(chains.map((chain) => chain.run(req)));

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      respond.badRequest(
        res,
        'Validation failed',
        errors.array().map((e) => e.msg)
      );
      return;
    }
    next();
  };
}
