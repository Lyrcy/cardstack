import {
  SingleResourceDoc,
  ResourceObject,
  AttributesObject,
  MetaObject,
  Links,
  Link,
  PaginationLinks,
  ImplementationInfo,
  RelationshipObject,
  RelationshipsObject,
  ResourceLinkage,
  ResourceIdentifierObject,
} from 'jsonapi-typescript';
import CardstackError from './error';

export class PristineDocument {
  kind = 'pristine';
  constructor(public jsonapi: SingleResourceDoc) {}
}

export class UpstreamDocument {
  kind = 'upstream';
  constructor(public jsonapi: SingleResourceDoc) {}
}

export type UpstreamIdentity = { originalRealm: URL; localId: string } | string;

export class SearchDocument {
  kind = 'search';
  constructor(public jsonapi: SingleResourceDoc) {}
}

export function assertSingleResourceDoc(body: any, pointer: string[] = ['']): asserts body is SingleResourceDoc {
  if (typeof body !== 'object' || body == null) {
    throw new CardstackError('missing json document', {
      source: { pointer: pointer.join('/') || '/' },
      status: 400,
    });
  }

  assertResourceObject(body.data, pointer.concat('data'));

  if (body.hasOwnProperty('included')) {
    let included = body.included;
    if (!Array.isArray(included)) {
      throw new CardstackError('included must be an array', {
        source: { pointer: pointer.concat('included').join('/') },
        status: 400,
      });
    }
    included.every((r, index) => assertResourceObject(r, pointer.concat(`[${index}]`)));
  }

  if (body.hasOwnProperty('jsonapi')) {
    assertImplementationInfo(body.jsonapi, pointer.concat('jsonapi'));
  }

  if (body.hasOwnProperty('links')) {
    let linksPointer = pointer.concat('links');
    try {
      assertLinks(body.links, linksPointer);
    } catch (err) {
      if (!err.isCardstackError) {
        throw err;
      }
      try {
        assertPaginationLinks(body.links, linksPointer);
      } catch (paginationError) {
        let e = new CardstackError(`resource-level links object is invalid`, {
          source: { pointer: linksPointer.join('/') },
          status: 400,
        });
        e.additionalErrors = [err, paginationError];
        throw e;
      }
    }
  }

  if (body.hasOwnProperty('meta')) {
    assertMetaObject(body.meta, pointer.concat('meta'));
  }
}

function assertResourceObject(obj: any, pointer: string[]): asserts obj is ResourceObject {
  if (typeof obj !== 'object' || obj == null) {
    throw new CardstackError('missing resource object', {
      source: { pointer: pointer.join('/') },
      status: 400,
    });
  }

  if (obj.hasOwnProperty('id') && typeof obj.id !== 'string') {
    throw new CardstackError('id is not a string', {
      source: { pointer: pointer.concat('id').join('/') },
      status: 400,
    });
  }

  if (typeof obj.type !== 'string') {
    throw new CardstackError('type must be a string', {
      source: { pointer: pointer.concat('type').join('/') },
      status: 400,
    });
  }

  if (obj.hasOwnProperty('attributes')) {
    assertAttributesObject(obj.attributes, pointer.concat('attributes'));
  }

  if (obj.hasOwnProperty('relationships')) {
    assertRelationshipsObject(obj.relationships, pointer.concat('relationships'));
  }

  if (obj.hasOwnProperty('links')) {
    assertLinks(obj.links, pointer.concat('links'));
  }

  if (obj.hasOwnProperty('meta')) {
    assertMetaObject(obj.meta, pointer.concat('meta'));
  }
}

function assertAttributesObject(obj: any, pointer: string[]): asserts obj is AttributesObject {
  Object.entries(obj).every(([key, value]) => assertJSONValue(value, pointer.concat(key)));
}

function assertJSONValue(v: any, pointer: string[]) {
  if (v === null) {
    return;
  }
  switch (typeof v) {
    case 'string':
    case 'number':
    case 'boolean':
      return;
    case 'object':
      if (Array.isArray(v)) {
        v.every((value, index) => assertJSONValue(value, pointer.concat(`[${index}]`)));
      } else {
        Object.entries(v).every(([key, value]) => assertJSONValue(value, pointer.concat(key)));
      }
      return;
  }
  throw new CardstackError('value not allowed in json', {
    source: { pointer: pointer.join('/') },
    status: 400,
  });
}

function assertMetaObject(obj: any, pointer: string[]): asserts obj is MetaObject {
  if (typeof obj !== 'object' || obj == null) {
    throw new CardstackError('meta must be an object', {
      source: { pointer: pointer.join('/') },
      status: 400,
    });
  }
  Object.entries(obj).every(([key, value]) => assertJSONValue(value, pointer.concat(key)));
}

function assertLinks(obj: any, pointer: string[]): asserts obj is Links {
  if (typeof obj !== 'object' || obj == null) {
    throw new CardstackError('links must be an object', {
      source: { pointer: pointer.join('/') },
      status: 400,
    });
  }
  if (obj.hasOwnProperty('self')) {
    assertLink(obj.self, pointer.concat('self'));
  }
  if (obj.hasOwnProperty('related')) {
    assertLink(obj.related, pointer.concat('related'));
  }
}

function assertLink(obj: any, pointer: string[]): asserts obj is Link {
  if (typeof obj === 'string') {
    return;
  }
  if (typeof obj !== 'object' || obj == null) {
    throw new CardstackError('link is not a string or object', {
      source: { pointer: pointer.join('/') },
      status: 400,
    });
  }
  if (typeof obj.href !== 'string') {
    throw new CardstackError('href is not a string', {
      source: { pointer: pointer.concat('href').join('/') },
      status: 400,
    });
  }
  if (obj.hasOwnProperty('meta')) {
    assertMetaObject(obj.meta, pointer.concat('meta'));
  }
}

function assertPaginationLinks(obj: any, pointer: string[]): asserts obj is PaginationLinks {
  if (typeof obj !== 'object' || obj == null) {
    throw new CardstackError('links is not an object', {
      source: { pointer: pointer.join('/') },
      status: 400,
    });
  }
  ['first', 'last', 'prev', 'next'].every(
    field => !obj.hasOwnproperty(field) || obj[field] === null || assertLink(obj[field], pointer.concat(field))
  );
}

function assertImplementationInfo(obj: any, pointer: string[]): asserts obj is ImplementationInfo {
  if (typeof obj !== 'object' || obj == null) {
    throw new CardstackError('JSON:API Object must be an object', {
      source: { pointer: pointer.join('/') },
      status: 400,
    });
  }
  if (obj.hasOwnProperty('meta')) {
    assertMetaObject(obj.meta, pointer.concat('meta'));
  }
  if (obj.hasOwnProperty('version') && typeof obj.version !== 'string') {
    throw new CardstackError('version must be a string', {
      source: { pointer: pointer.concat('version').join('/') },
      status: 400,
    });
  }
}

function assertRelationshipsObject(obj: any, pointer: string[]): asserts obj is RelationshipsObject {
  if (typeof obj !== 'object' || obj == null) {
    throw new CardstackError('relationships must be an object', {
      source: { pointer: pointer.join('/') },
      status: 400,
    });
  }
  Object.entries(obj).every(([key, value]) => assertRelationshipObject(value, pointer.concat(key)));
}

function assertRelationshipObject(obj: any, pointer: string[]): asserts obj is RelationshipObject {
  if (typeof obj !== 'object' || obj == null) {
    throw new CardstackError('relationship must be an object or null', {
      source: { pointer: pointer.join('/') },
      status: 400,
    });
  }

  if (!['meta', 'data', 'links'].some(field => obj.hasOwnProperty(field))) {
    throw new CardstackError('relationship must have at least one of: meta, data, links', {
      source: { pointer: pointer.join('/') },
      status: 400,
    });
  }

  if (obj.hasOwnProperty('meta')) {
    assertMetaObject(obj.meta, pointer.concat('meta'));
  }

  if (obj.hasOwnProperty('data')) {
    assertResourceLinkage(obj.data, pointer.concat('data'));
  }

  if (obj.hasOwnProperty('links')) {
    assertLinks(obj.links, pointer.concat('links'));
  }
}

function assertResourceLinkage(obj: any, pointer: string[]): asserts obj is ResourceLinkage {
  if (obj === null) {
    return;
  }
  if (Array.isArray(obj)) {
    obj.every((value, index) => assertResourceIdentifierObject(value, pointer.concat(`[${index}]`)));
  } else {
    assertResourceIdentifierObject(obj, pointer);
  }
}

function assertResourceIdentifierObject(obj: any, pointer: string[]): asserts obj is ResourceIdentifierObject {
  if (typeof obj !== 'object' || obj == null) {
    throw new CardstackError('resource identifier must be an object or null', {
      source: { pointer: pointer.join('/') },
      status: 400,
    });
  }
  if (obj.hasOwnProperty('meta')) {
    assertMetaObject(obj.meta, pointer.concat('meta'));
  }
  if (typeof obj.type !== 'string') {
    throw new CardstackError('type must be a string', {
      source: { pointer: pointer.concat('type').join('/') },
      status: 400,
    });
  }
  if (typeof obj.id !== 'string') {
    throw new CardstackError('id must be a string', {
      source: { pointer: pointer.concat('id').join('/') },
      status: 400,
    });
  }
}
