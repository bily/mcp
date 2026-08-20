/**
 * Auto-generated Fetch API client
 * Generated through Swagger MCP Server
 */

{?imports}{#imports}import { {name} } from "{path}";
{/imports}{/imports}

/**
 * API Configuration
 */
export const API_CONFIG = {
  baseURL: "{baseUrl}",
  headers: {
    "Content-Type": "application/json",
    "Accept": "application/json",
  }
};

/**
 * Fetch request helper function
 */
async function fetchRequest<T>(
  url: string, 
  method: string, 
  data?: any, 
  queryParams?: Record<string, string | number | boolean | undefined>
): Promise<T> {
  // Prepare URL with query parameters
  let requestUrl = `${API_CONFIG.baseURL}${url}`;
  
  if (queryParams) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(queryParams)) {
      if (value !== undefined) {
        params.append(key, String(value));
      }
    }
    const queryString = params.toString();
    if (queryString) {
      requestUrl += `?${queryString}`;
    }
  }
  
  // Prepare options
  const options: RequestInit = {
    method,
    headers: {
      ...API_CONFIG.headers,
      // Add auth token if available
      // "Authorization": `Bearer ${localStorage.getItem("auth_token")}`
    },
  };
  
  // Add body data for POST, PUT, PATCH
  if (["POST", "PUT", "PATCH"].includes(method) && data) {
    options.body = JSON.stringify(data);
  }
  
  // Make the request
  const response = await fetch(requestUrl, options);
  
  // Handle errors
  if (!response.ok) {
    const errorText = await response.text();
    const error = new Error(
      `API request failed with status ${response.status}: ${errorText}`
    );
    throw error;
  }
  
  // Parse JSON response
  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    return response.json();
  } else {
    return response.text() as unknown as T;
  }
}

/**
 * API client for {apiName}
 */
export class {apiClassName} {
  {#operations}
  /**
   * {summary}
   * {?description}
   * {description}
   * {/description}
   */
  public async {operationName}({#parameters}{name}{?isOptional}?{/isOptional}: {type}{?hasMore}, {/hasMore}{/parameters}): Promise<{returnType}> {
    {?hasQueryParams}const queryParams = {
      {#queryParams}{name}{?hasMore},{/hasMore}
      {/queryParams}
    };{/hasQueryParams}
    
    return fetchRequest<{returnType}>(
      `{url}`,
      "{methodUpper}",
      {?bodyParam}{bodyParam.name}{:undefined}{/bodyParam},
      {?hasQueryParams}queryParams{:undefined}{/hasQueryParams}
    );
  }

  {/operations}
}

/**
 * Create a new API client instance
 */
export function create{apiClassName}(): {apiClassName} {
  return new {apiClassName}();
}

/**
 * Default API client instance
 */
export const {apiInstanceName} = create{apiClassName}();
