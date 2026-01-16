export type ParsedFieldItem = {
  field: string;
  value: string | string[];
};

const labelMap: Record<string, string> = {
  buyer_name: "Buyer Name",
  seller_name: "Seller Name",
  property_address: "Property Address",
  property_city: "Property City",
  property_state: "Property State",
  property_zip: "Property Zip",
  purchase_price: "Purchase Price",
  earnest_money_amount: "Earnest Money Amount",
  earnest_money_delivery_date: "Earnest Money Due Date",
  contract_date: "Contract Date",
  effective_date: "Effective Date",
  closing_date: "Closing Date",
  possession_date: "Possession Date",
  title_insurance_company: "Title Insurance Company",
  closing_agent_company: "Closing Agent Company",
  closing_agent_name: "Closing Agent Name",
  information_verification_period: "Information Verification Period",
  included_items: "Included Items",
  buyer_signed_date: "Buyer Signed Date",
  seller_signed_date: "Seller Signed Date",
};

export function labelForField(field: string): string {
  return labelMap[field] || field.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export type ProjectTaskInput = {
  title: string;
  dueDate?: Date | null;
};

export function buildTasksFromItems(items: ParsedFieldItem[]): ProjectTaskInput[] {
  const tasks: ProjectTaskInput[] = [];

  for (const item of items) {
    const { field, value } = item;
    const vStr = Array.isArray(value) ? value.join(", ") : value;

    switch (field) {
      case "buyer_name":
        tasks.push({ title: `Confirm Buyer: ${vStr}` });
        break;
      case "seller_name":
        tasks.push({ title: `Confirm Seller: ${vStr}` });
        break;
      case "property_address":
        tasks.push({ title: `Confirm Property Address: ${vStr}` });
        break;
      case "closing_date":
        tasks.push({ title: "Verify Closing Documentation" });
        break;
      case "earnest_money_amount":
        tasks.push({ title: "Verify Earnest Money Deposit Received" });
        break;
      case "earnest_money_delivery_date":
        tasks.push({ title: `Track Earnest Money Deadline: ${vStr}` });
        break;
      case "purchase_price":
        tasks.push({ title: `Confirm Purchase Price: ${vStr}` });
        break;
      case "closing_agent_name":
        tasks.push({ title: `Coordinate with Closing Agent: ${vStr}` });
        break;
      case "title_insurance_company":
        tasks.push({ title: `Request Title Commitment: ${vStr}` });
        break;
      case "included_items":
        if (Array.isArray(value)) {
          value.forEach((itemName) => {
            tasks.push({ title: `Confirm included item: ${itemName}` });
          });
        } else {
          tasks.push({ title: `Review included items: ${vStr}` });
        }
        break;
      case "contract_date":
        tasks.push({ title: `Record Contract Date: ${vStr}` });
        break;
      case "effective_date":
        tasks.push({ title: `Record Effective Date: ${vStr}` });
        break;
      case "possession_date":
        tasks.push({ title: `Confirm Possession Date: ${vStr}` });
        break;
      case "buyer_signed_date":
        tasks.push({ title: `Verify Buyer Signature Date: ${vStr}` });
        break;
      case "seller_signed_date":
        tasks.push({ title: `Verify Seller Signature Date: ${vStr}` });
        break;
      default:
        tasks.push({ title: `Review ${labelForField(field)}: ${vStr}` });
    }
  }

  return tasks;
}

