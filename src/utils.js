import * as d3 from 'd3';

export const DATA_PATH = 'data';

export async function loadCSV(filename) {
    const res = await this.fetch(`${DATA_PATH}/${filename}`);
    return d3.csvParse(await res.text());
}
