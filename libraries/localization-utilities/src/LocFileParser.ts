// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import { ITerminal, NewlineKind } from '@rushstack/node-core-library';

import type { IgnoreStringFunction, ILocalizationFile, IParseFileOptions } from './interfaces';
import { parseLocJson } from './parsers/parseLocJson';
import { parseResJson } from './parsers/parseResJson';
import { readResxAsLocFile } from './ResxReader';

/**
 * @public
 */
export type ParserKind = 'resx' | 'loc.json' | 'resjson';

/**
 * @public
 */
export interface IParseLocFileOptions extends IParseFileOptions {
  terminal: ITerminal;
  parser?: ParserKind;
  resxNewlineNormalization: NewlineKind | undefined;
  ignoreMissingResxComments: boolean | undefined;
}

interface IParseCacheEntry {
  content: string;
  parsedFile: ILocalizationFile;
  ignoreString: IgnoreStringFunction | undefined;
}

const parseCache: Map<string, IParseCacheEntry> = new Map<string, IParseCacheEntry>();

export function selectParserByFilePath(filePath: string): ParserKind {
  if (/\.resx$/i.test(filePath)) {
    return 'resx';
  } else if (/\.(resx|loc)\.json$/i.test(filePath)) {
    return 'loc.json';
  } else if (/\.resjson$/i.test(filePath)) {
    return 'resjson';
  } else {
    throw new Error(`Unsupported file extension in file: ${filePath}`);
  }
}

/**
 * @public
 */
export function parseLocFile(options: IParseLocFileOptions): ILocalizationFile {
  const { parser = selectParserByFilePath(options.filePath) } = options;

  if (parser === 'resx') {
    const fileCacheKey: string = `${options.filePath}?${options.resxNewlineNormalization || 'none'}`;
    const parseCacheEntry: IParseCacheEntry | undefined = parseCache.get(fileCacheKey);
    if (parseCacheEntry) {
      if (
        parseCacheEntry.content === options.content &&
        parseCacheEntry.ignoreString === options.ignoreString
      ) {
        return parseCacheEntry.parsedFile;
      }
    }

    const parsedFile: ILocalizationFile = readResxAsLocFile(options.content, {
      terminal: options.terminal,
      resxFilePath: options.filePath,
      newlineNormalization: options.resxNewlineNormalization,
      warnOnMissingComment: !options.ignoreMissingResxComments,
      ignoreString: options.ignoreString
    });
    parseCache.set(fileCacheKey, {
      content: options.content,
      parsedFile,
      ignoreString: options.ignoreString
    });

    return parsedFile;
  } else if (parser === 'loc.json') {
    return parseLocJson(options);
  } else if (parser === 'resjson') {
    return parseResJson(options);
  } else {
    throw new Error(`Unsupported parser: ${parser}`);
  }
}
