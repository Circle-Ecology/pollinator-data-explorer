
 // @vitest-environment jsdom

import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import ObservationDetailField from '../../src/components/ObservationDetailField'

describe('ObservationDetailField', () => {
  it('displays the label and value', () => {
    render(
      <ObservationDetailField
        label="Common name"
        value="Mason bee"
      />
    )

    expect(screen.getByText(/Common name/)).toBeTruthy()
    expect(screen.getByText(/Mason bee/)).toBeTruthy()
  })

  it('displays Not recorded when the value is missing', () => {
    render(
      <ObservationDetailField
        label="Plug color"
        value={null}
      />
    )

    expect(screen.getByText(/Not recorded/)).toBeTruthy()
  })

  it('displays zero as a valid value', () => {
    render(
      <ObservationDetailField
        label="Plug depth"
        value={0}
      />
    )

    expect(screen.getByText(/0/)).toBeTruthy()
  })
})
