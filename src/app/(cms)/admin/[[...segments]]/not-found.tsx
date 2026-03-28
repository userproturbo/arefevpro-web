/* THIS FILE WAS GENERATED AUTOMATICALLY BY PAYLOAD. */
/* DO NOT MODIFY IT BECAUSE IT COULD BE REWRITTEN AT ANY TIME. */
import config from '@payload-config';
import { NotFoundPage } from '@payloadcms/next/views';

import { importMap } from '../importMap';

type Args = {
  params: Promise<{ segments?: string[] }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

const normalizeParams = async (params: Args['params']) => {
  const resolvedParams = await params;

  return {
    segments: resolvedParams.segments ?? [],
  };
};

const normalizeSearchParams = async (searchParams: Args['searchParams']) => {
  const resolvedSearchParams = await searchParams;

  return Object.fromEntries(
    Object.entries(resolvedSearchParams).filter(([, value]) => value !== undefined),
  ) as { [key: string]: string | string[] };
};

const NotFound = ({ params, searchParams }: Args) =>
  NotFoundPage({
    config,
    importMap,
    params: normalizeParams(params),
    searchParams: normalizeSearchParams(searchParams),
  });

export default NotFound;
