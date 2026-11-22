import { describe, expect, it } from 'bun:test';
import { readReplyTag, stripReplyTags, visibleReply } from './replyTag';

describe('readReplyTag', () => {
  it('reads the last tag, tolerating spaces and case', () => {
    expect(readReplyTag('Nice. What then?<next/>')).toBe('next');
    expect(readReplyTag('No rush. Which one?<follow/>')).toBe('follow');
    expect(readReplyTag('Which one? < next />')).toBe('next');
    expect(readReplyTag('Which one?<NEXT/>')).toBe('next');
    expect(readReplyTag('<follow/> and then <next/>')).toBe('next');
    expect(readReplyTag('Plain question?')).toBeNull();
  });
});

describe('stripReplyTags', () => {
  it('removes tags and trims', () => {
    expect(stripReplyTags('What then? <next/>')).toBe('What then?');
    expect(stripReplyTags('What then?')).toBe('What then?');
  });
});

describe('visibleReply', () => {
  it('hides finished and unfinished tags at the end', () => {
    expect(visibleReply('What then?<')).toBe('What then?');
    expect(visibleReply('What then?<fol')).toBe('What then?');
    expect(visibleReply('What then?<follow/')).toBe('What then?');
    expect(visibleReply('What then?<next/>')).toBe('What then?');
  });

  it('keeps text that only looks like a tag', () => {
    expect(visibleReply('I <3 this')).toBe('I <3 this');
    expect(visibleReply('a < b')).toBe('a < b');
  });
});
