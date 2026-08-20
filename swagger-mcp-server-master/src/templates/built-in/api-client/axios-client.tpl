/**
 * Auto-generated Axios API client
 * Generated through Swagger MCP Server
 */
import { AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";
import { axiosInstance } from "{configImportPath}";

{?imports}{#imports}import { {name} } from "{path}";
{/imports}{/imports}

/**
 * API client for {apiName}
 */
export class {apiClassName} {
  private axios: AxiosInstance;

  constructor(axiosInstance?: AxiosInstance) {
    this.axios = axiosInstance || axiosInstance;
  }

  {#operations}
  /**
   * {summary}
   * {?description}
   * {description}
   * {/description}
   */
  public async {operationName}({#parameters}{name}{?isOptional}?{/isOptional}: {type}{?hasMore}, {/hasMore}{/parameters}): Promise<{returnType}> {
    {?bodyParam}const data = {bodyParam.name};{/bodyParam}
    
    const response = await this.axios.{method}(
      `{url}`,
      {?isRequestWithBody}{bodyParam.name}{/isRequestWithBody}
      {?queryParams}{ params: { {#queryParams}{name}{?hasMore}, {/hasMore}{/queryParams} } }{/queryParams}
    );
    
    return response.data;
  }

  {/operations}
}

/**
 * Create a new API client instance
 */
export function create{apiClassName}(axiosInstance?: AxiosInstance): {apiClassName} {
  return new {apiClassName}(axiosInstance);
}

/**
 * Default API client instance
 */
export const {apiInstanceName} = create{apiClassName}(axiosInstance);
