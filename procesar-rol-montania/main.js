import data from "./tableConvert.com_xyz54d.json" assert { type: "json" };


function getProductByBarcode(barcode) {
  return data.find((product) => product.Codigo === barcode);
}

console.log(getProductByBarcode("7750182000897"));
