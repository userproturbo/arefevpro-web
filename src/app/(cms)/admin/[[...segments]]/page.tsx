/* THIS FILE WAS GENERATED AUTOMATICALLY BY PAYLOAD. */
/* DO NOT MODIFY IT BECAUSE IT COULD BE REWRITTEN AT ANY TIME. */
import type { Metadata } from 'next';

import config from '@payload-config';
import { RootPage, generatePageMetadata } from '@payloadcms/next/views';

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

export const generateMetadata = async ({ params, searchParams }: Args): Promise<Metadata> =>
  generatePageMetadata({
    config,
    params: normalizeParams(params),
    searchParams: normalizeSearchParams(searchParams),
  });

const Page = ({ params, searchParams }: Args) =>
  RootPage({
    config,
    importMap,
    params: normalizeParams(params),
    searchParams: normalizeSearchParams(searchParams),
  });

export default Page;
