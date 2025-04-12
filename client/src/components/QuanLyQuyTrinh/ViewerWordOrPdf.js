import React from "react";
import DocViewer, { DocViewerRenderers } from "@cyntler/react-doc-viewer";

const ViewerWordOrPdf = ({ fileUrl, onClose }) => {
    const docs = [
        { uri: fileUrl } // URL từ server trả về
    ];

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: "#fff", zIndex: 1000 }}>
            <button style={{ position: "absolute", top: 10, right: 10, zIndex: 1100 }} onClick={onClose}>
                Đóng
            </button>
            <DocViewer
                documents={docs}
                pluginRenderers={DocViewerRenderers}
                config={{
                    header: {
                        disableHeader: false,
                        disableFileName: false,
                        retainURLParams: true,
                    },
                }}
                style={{ height: "100%", width: "100%" }}
            />
        </div>
    );
};

export default ViewerWordOrPdf;
