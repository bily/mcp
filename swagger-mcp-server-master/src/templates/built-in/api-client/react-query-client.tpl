/**
 * Auto-generated React Query client
 * Generated through Swagger MCP Server
 */
import { useMutation, useQuery, UseQueryOptions, UseMutationOptions } from "react-query";
import { {apiClassName}, {apiInstanceName} } from "{apiClientImportPath}";

{?imports}{#imports}import { {name} } from "{path}";
{/imports}{/imports}

/**
 * React Query hooks for {apiName}
 */
{#operations}
/**
 * {summary}
 * {?description}
 * {description}
 * {/description}
 */
{?isGet}export function use{operationNamePascal}(
  {#parameters}{name}: {type}, {/parameters}
  options?: UseQueryOptions<{returnType}, Error>
) {
  return useQuery<{returnType}, Error>(
    // Query key - includes endpoint and parameters
    [{?parameters}{#parameters}"{name}", {name}, {/parameters}{/parameters}],
    // Query function
    () => {apiInstanceName}.{operationName}({#parameters}{name}, {/parameters}),
    // Options
    options
  );
}{/isGet}

{?isNotGet}export function use{operationNamePascal}(
  options?: UseMutationOptions<
    {returnType},
    Error,
    {#parameters}{name}: {type}{?hasMore} & {/hasMore}{/parameters}
  >
) {
  return useMutation<
    {returnType},
    Error,
    {#parameters}{name}: {type}{?hasMore} & {/hasMore}{/parameters}
  >(
    // Mutation function
    ({#parameters}{name}{?hasMore}, {/hasMore}{/parameters}) => 
      {apiInstanceName}.{operationName}({#parameters}{name}{?hasMore}, {/hasMore}{/parameters}),
    // Options
    options
  );
}{/isNotGet}

{/operations}
