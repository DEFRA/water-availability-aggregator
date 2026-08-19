function toParcelItem(parcel, index) {
  return {
    id: parcel.parcelId,
    label: `${parcel.sheetId}-${parcel.parcelNumber}`,
    source: 'rpa',
    geometryType: 'Polygon',
    location: {
      easting: parcel.centroidEasting,
      northing: parcel.centroidNorthing
    },
    properties: {
      sbi: parcel.sbi,
      sheetId: parcel.sheetId,
      parcelNumber: parcel.parcelNumber,
      landUseCode: parcel.landUseCode,
      areaHa: parcel.areaHa,
      sampleOrder: index + 1
    }
  }
}

const stubParcels = [
  {
    parcelId: 'RPA-CP-0001',
    sbi: '106543210',
    sheetId: 'TQ42NE',
    parcelNumber: '0012',
    landUseCode: 'PG01',
    areaHa: 3.47,
    centroidEasting: 553210,
    centroidNorthing: 109320
  },
  {
    parcelId: 'RPA-CP-0002',
    sbi: '106543210',
    sheetId: 'TQ42NE',
    parcelNumber: '0034',
    landUseCode: 'AR01',
    areaHa: 5.12,
    centroidEasting: 553870,
    centroidNorthing: 108950
  },
  {
    parcelId: 'RPA-CP-0003',
    sbi: '106543210',
    sheetId: 'TQ42NE',
    parcelNumber: '0041',
    landUseCode: 'OT02',
    areaHa: 1.26,
    centroidEasting: 554040,
    centroidNorthing: 109610
  },
  {
    parcelId: 'RPA-CP-0004',
    sbi: '108765432',
    sheetId: 'SU11SW',
    parcelNumber: '0109',
    landUseCode: 'PG01',
    areaHa: 7.01,
    centroidEasting: 441990,
    centroidNorthing: 113020
  }
]

export function getRpaParcelStub(limit) {
  return stubParcels
    .slice(0, limit)
    .map((parcel, index) => toParcelItem(parcel, index))
}
