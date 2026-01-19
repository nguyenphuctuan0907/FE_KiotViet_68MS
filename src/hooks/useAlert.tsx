import { useAlertContext } from "../components/Alert/AlertProvider";

export const useAlert = () => {
  const { showAlert } = useAlertContext();
  return showAlert;
};
