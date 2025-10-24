/**
 * Retry utility for handling database replication lag
 * Useful for queries immediately after mutations in production
 */

export async function retryQueryUntilSuccess<T>(
  queryFn: () => Promise<T>,
  validateFn: (result: T) => boolean,
  maxAttempts = 5,
  delayMs = 500
): Promise<T> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await queryFn();
      
      if (validateFn(result)) {
        console.log(`✅ Query successful on attempt ${attempt}/${maxAttempts}`);
        return result;
      }
      
      if (attempt < maxAttempts) {
        console.log(`⏳ Retry attempt ${attempt}/${maxAttempts} - validation failed, retrying...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    } catch (error) {
      console.error(`❌ Query attempt ${attempt}/${maxAttempts} failed:`, error);
      
      if (attempt === maxAttempts) {
        throw error;
      }
      
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  
  throw new Error('Query retry limit exceeded - validation never succeeded');
}

/**
 * Simple retry for queries that may fail due to replication lag
 */
export async function retryQuery<T>(
  queryFn: () => Promise<T>,
  maxAttempts = 3,
  delayMs = 800
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await queryFn();
      console.log(`✅ Query successful on attempt ${attempt}/${maxAttempts}`);
      return result;
    } catch (error) {
      lastError = error;
      console.error(`❌ Query attempt ${attempt}/${maxAttempts} failed:`, error);
      
      if (attempt < maxAttempts) {
        console.log(`⏳ Retrying in ${delayMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }
  
  throw lastError;
}
