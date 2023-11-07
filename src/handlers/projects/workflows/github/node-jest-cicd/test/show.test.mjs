/* global beforeAll describe expect fail test */
import * as fsPath from 'node:path'

import { Reporter } from '@liquid-labs/catalyst-server'

import * as showHandler from '../show'

const testPkgPath = fsPath.join(__dirname, 'data', 'pkgD')

describe('GET:/projects/workflows/github/node-jest-cicd/show', () => {
  let body
  const reporter = new Reporter({ silent : true })

  const mockReq = {
    accepts : () => 'text/plain',
    get     : (header) => header === 'X-CWD' ? testPkgPath : undefined,
    vars    : {}
  }

  const mockRes = {
    type  : () => {},
    write : (text) => { body = text },
    end   : () => {}
  }

  beforeAll(async() => {
    const handler = showHandler.func({ reporter })
    await handler(mockReq, mockRes)
  })

  test('returns the script', () => {
    expect(body).toEqual("I'm a script!\n\n") // TODO: httpSmartResponse idiomatically adds newlines (1.0.0-alpha.3)
  })

  test("lack of a 'X-CWD' header results in an exception", async() => {
    const exceptReq = Object.assign({}, mockReq, { get : () => undefined })
    const handler = showHandler.func({ reporter })
    try {
      await handler(exceptReq, mockRes)
      fail('failed to throw')
    }
    catch (e) {
      expect(e.message).toMatch(/X-CWD/)
    }
  })
})
