
 // @vitest-environment jsdom

import { describe, expect, it, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import ObservationDetailField from '../../src/components/ObservationDetailField'

afterEach(() => {
  cleanup()
})

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

  it('displays Not recorded when the value is null', () => {
    render(
      <ObservationDetailField
        label="Plug color"
        value={null}
      />
    )

    expect(screen.getByText(/Not recorded/)).toBeTruthy()
  })

  it('displays Not recorded for an empty string', () => {
    render(
      <ObservationDetailField
        label="Plug color"
        value="   "
      />
    )

    expect(screen.getByText(/Not recorded/)).toBeTruthy()
  })

  it('displays Not recorded for undefined', () => {
    render(
      <ObservationDetailField
        label="Plug color"
        value={undefined}
      />
    )

    expect(screen.getByText(/Not recorded/)).toBeTruthy()
  })

  it('displays Not recorded for NaN', () => {
    render(
      <ObservationDetailField
        label="Plug depth"
        value={NaN}
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

    expect(screen.getByText('Plug depth:')).toBeTruthy()
    expect(screen.getByText('0')).toBeTruthy()
  })

  it('displays Yes when the value is true', () => {
    render(
      <ObservationDetailField
        label="Manufactured empty"
        value={true}
      />
    )

    expect(screen.getByText('Manufactured empty:')).toBeTruthy()
    expect(screen.getByText('Yes')).toBeTruthy()
  })

  it('displays No when the value is false', () => {
    render(
      <ObservationDetailField
        label="Manufactured empty"
        value={false}
      />
    )

    expect(screen.getByText('Manufactured empty:')).toBeTruthy()
    expect(screen.getByText('No')).toBeTruthy()
  })

  it('displays Not recorded for an empty array', () => {
    render(
      <ObservationDetailField
        label="Species"
        value={[]}
      />
    )

    expect(screen.getByText(/Not recorded/)).toBeTruthy()
  })
})
