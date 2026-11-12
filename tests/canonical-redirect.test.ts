import test from 'node:test';
import assert from 'node:assert/strict';
import { canonicalRedirectUrl } from '../src/lib/site-url';

test('www and HTTP requests reach the HTTPS apex in one permanent redirect', () => {
  for (const source of ['https://www.1in8bn.com/', 'http://www.1in8bn.com/', 'http://1in8bn.com/']) {
    assert.equal(canonicalRedirectUrl(source)?.href, 'https://1in8bn.com/');
  }
});

test('canonical redirects preserve localized paths and encoded query parameters', () => {
  const source = 'http://www.1in8bn.com/fr/?share=a%2Fb&next=%2Fja%2F&x=1&x=2';
  assert.equal(canonicalRedirectUrl(source)?.href, 'https://1in8bn.com/fr/?share=a%2Fb&next=%2Fja%2F&x=1&x=2');
});

test('legacy English URLs combine host and HTTPS normalization without an extra hop', () => {
  for (const path of ['/en', '/en/']) {
    assert.equal(canonicalRedirectUrl(`http://www.1in8bn.com${path}?share=abc`)?.href, 'https://1in8bn.com/?share=abc');
  }
});

test('canonical production URLs do not loop and preview hosts remain available', () => {
  for (const url of ['https://1in8bn.com/', 'https://1in8bn.com/fr/?share=abc', 'https://1in8bn.1in8bn.workers.dev/', 'http://localhost:3089/fr/']) {
    assert.equal(canonicalRedirectUrl(url), null);
  }
  assert.equal(canonicalRedirectUrl('http://localhost:3089/en/')?.href, 'http://localhost:3089/');
});

test('forks redirect to their configured origin while preserving localized invitation URLs', () => {
  for (const origin of ['https://example.org', 'https://www.example.org']) {
    assert.equal(
      canonicalRedirectUrl('http://www.example.org:8080/fr/?share=a%2Fb&x=1&x=2', origin)?.href,
      `${origin}/fr/?share=a%2Fb&x=1&x=2`,
    );
    assert.equal(canonicalRedirectUrl(`http://example.org/en/?share=abc`, origin)?.href, `${origin}/?share=abc`);
    assert.equal(canonicalRedirectUrl(`${origin}/fr/`, origin), null);
    assert.equal(canonicalRedirectUrl('https://preview.example.net/fr/', origin), null);
    assert.equal(canonicalRedirectUrl('https://www.1in8bn.com/fr/', origin), null);
  }
});

test('a configured local origin retains its scheme and port without redirect loops', () => {
  const origin = 'http://localhost:3089';
  assert.equal(canonicalRedirectUrl(`${origin}/`, origin), null);
  assert.equal(canonicalRedirectUrl(`${origin}/en/?share=abc`, origin)?.href, `${origin}/?share=abc`);
});
