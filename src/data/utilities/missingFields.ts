export default function missingFields(data: any, fields: string[]) {
    const missingFields = fields.filter(field => data[field] === null || data[field] === undefined);
    return missingFields;
}