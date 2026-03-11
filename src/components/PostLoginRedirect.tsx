import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";

/**
 * Handles redirect after successful login when user had a pending action.
 * Must be rendered inside BrowserRouter.
 */
const PostLoginRedirect = () => {
  const navigate = useNavigate();
  const { session, pendingAction, dismissLogin } = useUser();

  useEffect(() => {
    if (!session || !pendingAction) return;
    if (pendingAction === "camera") {
      navigate("/upload");
    } else if (pendingAction === "profile") {
      navigate("/settings");
    }
    dismissLogin();
  }, [session, pendingAction, navigate, dismissLogin]);

  return null;
};

export default PostLoginRedirect;
