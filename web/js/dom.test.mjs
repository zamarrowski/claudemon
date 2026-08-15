import { expect, test } from 'vitest'
import { escapeHtml, html, markupOf, raw } from './dom.mjs'

test('Should escape anything a player could have named their Pokemon', () => {
  const nickname = '<img src=x onerror="steal()">'

  expect(markupOf(html`<span>${nickname}</span>`)).toBe(
    '<span>&lt;img src=x onerror=&quot;steal()&quot;&gt;</span>',
  )
  expect(escapeHtml("Ash's & Misty's")).toBe('Ash&#39;s &amp; Misty&#39;s')
})

test('Should keep markup that was built with the template, and join a list of it', () => {
  const rows = [1, 2].map((value) => html`<li>${value}</li>`)

  expect(
    markupOf(
      html`<ul>
        ${rows}
      </ul>`,
    ),
  ).toContain('<li>1</li><li>2</li>')
  expect(markupOf(html`<b>${raw('<i>ok</i>')}</b>`)).toBe('<b><i>ok</i></b>')
})

test('Should render nothing for the branches a view chose not to draw', () => {
  expect(markupOf(html`<p>${null}${undefined}${false}</p>`)).toBe('<p></p>')
})
