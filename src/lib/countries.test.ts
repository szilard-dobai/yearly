import { describe, it, expect } from 'vitest'
import { getAllCountries, getCountryByCode, searchCountries } from './countries'

describe('countries utilities', () => {
  describe('getAllCountries', () => {
    it('should return array of countries', () => {
      const countries = getAllCountries()
      expect(Array.isArray(countries)).toBe(true)
      expect(countries.length).toBeGreaterThan(0)
    })

    it('should return countries with code and name', () => {
      const countries = getAllCountries()
      const firstCountry = countries[0]
      expect(firstCountry).toHaveProperty('code')
      expect(firstCountry).toHaveProperty('name')
      expect(typeof firstCountry.code).toBe('string')
      expect(typeof firstCountry.name).toBe('string')
    })

    it('should have common countries', () => {
      const countries = getAllCountries()
      const countryCodes = countries.map((c) => c.code)
      expect(countryCodes).toContain('US')
      expect(countryCodes).toContain('GB')
      expect(countryCodes).toContain('FR')
      expect(countryCodes).toContain('DE')
      expect(countryCodes).toContain('JP')
    })
  })

  describe('getCountryByCode', () => {
    it('should return country for valid code', () => {
      const country = getCountryByCode('US')
      expect(country).toBeDefined()
      expect(country?.code).toBe('US')
      expect(country?.name).toBe('United States')
    })

    it('should return undefined for invalid code', () => {
      const country = getCountryByCode('ZZ')
      expect(country).toBeUndefined()
    })

    it('should be case sensitive', () => {
      const country = getCountryByCode('us')
      expect(country).toBeUndefined()
    })

    it('should return correct countries', () => {
      expect(getCountryByCode('GB')?.name).toBe('United Kingdom')
      expect(getCountryByCode('FR')?.name).toBe('France')
      expect(getCountryByCode('DE')?.name).toBe('Germany')
      expect(getCountryByCode('JP')?.name).toBe('Japan')
    })
  })

  describe('searchCountries', () => {
    it('should return all countries for empty query', () => {
      const results = searchCountries('')
      expect(results.length).toBe(getAllCountries().length)
    })

    it('should search by full name', () => {
      const results = searchCountries('United States')
      expect(results.length).toBeGreaterThan(0)
      expect(results[0].name).toBe('United States')
    })

    it('should search by partial name', () => {
      const results = searchCountries('United')
      expect(results.length).toBeGreaterThan(0)
      expect(results.some((c) => c.name === 'United States')).toBe(true)
      expect(results.some((c) => c.name === 'United Kingdom')).toBe(true)
      expect(results.some((c) => c.name === 'United Arab Emirates')).toBe(true)
    })

    it('should be case insensitive', () => {
      const results1 = searchCountries('france')
      const results2 = searchCountries('France')
      const results3 = searchCountries('FRANCE')
      expect(results1.length).toBeGreaterThan(0)
      expect(results1.length).toBe(results2.length)
      expect(results2.length).toBe(results3.length)
    })

    it('should return empty array for non-existent country', () => {
      const results = searchCountries('Atlantis')
      expect(results).toHaveLength(0)
    })

    it('should handle whitespace', () => {
      const results = searchCountries('  United  ')
      expect(results.length).toBeGreaterThan(0)
    })

    it('should search in country name', () => {
      const results = searchCountries('land')
      expect(results.length).toBeGreaterThan(0)
      expect(results.some((c) => c.name.includes('land'))).toBe(true)
    })
  })
})
